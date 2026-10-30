import { Controller, Get, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { EventBusService } from './event-bus.service';
import { AuthService } from '../auth/auth.service';
import { Subscription } from 'rxjs';

/**
 * Panel anlık veri akışı (SSE).
 * Event bus -> tenant'a bağlı tarayıcılara text/event-stream.
 * GET /api/events/stream?tenantId=..&token=..
 * Frontend `data-refresh` CustomEvent'ine çevirir.
 */
@Controller('events')
export class EventsStreamController {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly auth: AuthService,
  ) {}

  @Get('stream')
  stream(
    @Query('tenantId') tenantId: string,
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const session = this.auth.validateToken(token);
    if (!session || (tenantId && session.tenantId !== tenantId)) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const tid = session.tenantId;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(`event: hello\ndata: {"ok":true}\n\n`);

    let sub: Subscription | null = null;
    const keepAlive = setInterval(() => {
      try { res.write(': ping\n\n'); } catch { /* yoksay */ }
    }, 25000);

    try {
      sub = this.eventBus.onAll().subscribe((event) => {
        const type = String(event.type || '');
        if (!(type.startsWith('ORDER_') || type.startsWith('PAYMENT_') ||
              type === 'COMPLAINT_CREATED' || type === 'REQUEST_CREATED' || type === 'CALL_ENDED')) return;
        if ((event as any).tenantId !== tid) return;
        const payload = {
          eventType: type,
          entityId: (event as any).entityId || null,
          data: (event as any).payload || null,
        };
        try { res.write(`event: refresh\ndata: ${JSON.stringify(payload)}\n\n`); } catch { /* yoksay */ }
      });
    } catch { /* yoksay */ }

    const cleanup = () => {
      clearInterval(keepAlive);
      try { sub?.unsubscribe(); } catch { /* yoksay */ }
      try { res.end(); } catch { /* yoksay */ }
    };
    req.on('close', cleanup);
    req.on('aborted', cleanup);
  }
}
