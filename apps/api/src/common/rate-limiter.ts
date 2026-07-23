import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private requests = new Map<string, { count: number; startTime: number }>();
  private readonly maxRequests = 100;
  private readonly windowMs = 60000;

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const record = this.requests.get(ip);
    if (!record || record.startTime < windowStart) {
      this.requests.set(ip, { count: 1, startTime: now });
      next();
      return;
    }

    if (record.count >= this.maxRequests) {
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: 429,
        message: 'Cok fazla istek. Lutfen bekleyin.',
        retryAfter: Math.ceil((record.startTime + this.windowMs - now) / 1000),
      });
      return;
    }

    record.count++;
    next();
  }
}
