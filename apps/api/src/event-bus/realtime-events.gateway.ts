import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { WebSocketServer, WebSocket } from 'ws';
import { EventBusService } from './event-bus.service';
import { AuthService } from '../auth/auth.service';

/**
 * Panel için anlık veri push'u.
 * Event bus (ORDER_CREATED, COMPLAINT_CREATED, REQUEST_CREATED, CALL_ENDED vb.) -> tenant'a bağlı tarayıcılara WS.
 * Path: /api/ws/events?tenantId=..&token=..
 * Frontend `data-refresh` CustomEvent'ine çevirir; sayfalar bu olayda kendini yeniler.
 */
@Injectable()
export class RealtimeEventsGateway implements OnApplicationBootstrap {
  private readonly logger = new Logger(RealtimeEventsGateway.name);
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, Set<WebSocket>>();

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly eventBus: EventBusService,
    private readonly auth: AuthService,
  ) {}

  onApplicationBootstrap() {
    this.eventBus.onAll().subscribe((event) => {
      const type = String(event.type || '');
      // Sadeceleştir: sipariş/talep/şikayet/arama bitişi gibi paneli etkileyen olaylar
      if (type.startsWith('ORDER_') || type.startsWith('PAYMENT_') ||
          type === 'COMPLAINT_CREATED' || type === 'REQUEST_CREATED' || type === 'CALL_ENDED') {
        this.broadcast((event as any).tenantId, {
          eventType: type,
          entityId: (event as any).entityId || null,
          data: (event as any).payload || null,
        });
      }
    });

    try {
      const server = this.adapterHost.httpAdapter?.getHttpServer();
      if (!server) return;
      this.wss = new WebSocketServer({ server, path: '/api/ws/events', perMessageDeflate: false });
      this.wss.on('connection', (socket, req) => this.handleConnection(socket, req as any));
      this.logger.log('RealtimeEventsGateway listening on /api/ws/events');
    } catch (e) {
      this.logger.error(`WS events gateway baslatilamadi: ${(e as Error).message}`);
    }
  }

  private handleConnection(socket: WebSocket, req: any) {
    try {
      const url = new URL(String(req.url || ''), 'http://localhost');
      const tenantId = String(url.searchParams.get('tenantId') || '');
      const token = String(url.searchParams.get('token') || '');
      const session = this.auth.validateToken(token);
      if (!session || (tenantId && session.tenantId !== tenantId)) {
        try { socket.send(JSON.stringify({ eventType: 'error', data: { message: 'unauthorized' } })); } catch { }
        socket.close(1008, 'unauthorized');
        return;
      }
      const tid = session.tenantId;
      const set = this.clients.get(tid) || new Set<WebSocket>();
      set.add(socket);
      this.clients.set(tid, set);
      socket.on('close', () => { set.delete(socket); if (!set.size) this.clients.delete(tid); });
      socket.on('error', () => { set.delete(socket); });
      socket.on('message', (raw) => {
        try {
          const m = JSON.parse(raw.toString());
          if (m?.type === 'ping') socket.send(JSON.stringify({ eventType: 'pong' }));
        } catch { }
      });
      try { socket.send(JSON.stringify({ eventType: 'hello', data: { ok: true } })); } catch { }
    } catch {
      try { socket.close(); } catch { }
    }
  }

  private broadcast(tenantId: string, msg: Record<string, unknown>) {
    if (!tenantId) return;
    const set = this.clients.get(tenantId);
    if (!set?.size) return;
    let raw: string;
    try { raw = JSON.stringify(msg); } catch { return; }
    for (const s of set) {
      try { if (s.readyState === WebSocket.OPEN) s.send(raw); } catch { }
    }
  }
}
