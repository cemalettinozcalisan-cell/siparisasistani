import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private requests = new Map<string, { count: number; startTime: number }>();
  private endpoints = new Map<string, RateLimitConfig>();

  constructor() {
    // Default: 100 req/min for general endpoints
    this.endpoints.set('default', { windowMs: 60000, maxRequests: 100 });
    // Auth endpoints: 10 req/min (brute force protection)
    this.endpoints.set('/api/auth', { windowMs: 60000, maxRequests: 10 });
    // Webhook endpoints: 50 req/min
    this.endpoints.set('/api/webhook', { windowMs: 60000, maxRequests: 50 });
    // Instagram webhook: 30 req/min
    this.endpoints.set('/api/instagram', { windowMs: 60000, maxRequests: 30 });
  }

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const path = req.path || '';
    const now = Date.now();

    // Find matching endpoint config
    let config: RateLimitConfig | undefined = this.endpoints.get('default');
    for (const [prefix, cfg] of this.endpoints) {
      if (path.startsWith(prefix)) {
        config = cfg;
        break;
      }
    }
    if (!config) config = { windowMs: 60000, maxRequests: 100 };

    const key = `${ip}:${path}`;
    const windowStart = now - config.windowMs;

    // Periodic cleanup every 100 requests
    if (this.requests.size > 10000) {
      this.cleanup(windowStart);
    }

    const record = this.requests.get(key);
    if (!record || record.startTime < windowStart) {
      this.requests.set(key, { count: 1, startTime: now });
      next();
      return;
    }

    if (record.count >= config.maxRequests) {
      const retryAfter = Math.ceil((record.startTime + config.windowMs - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: 429,
        message: 'Çok fazla istek. Lütfen bekleyin.',
        retryAfter,
      });
      return;
    }

    record.count++;
    next();
  }

  private cleanup(before: number) {
    for (const [key, record] of this.requests) {
      if (record.startTime < before) {
        this.requests.delete(key);
      }
    }
  }
}
