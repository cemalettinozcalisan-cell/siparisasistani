import { Injectable, Logger } from '@nestjs/common';
import { NotificationHandler } from './base.handler';
import { SystemEvent } from '../../event-bus/event-bus.service';
import { VoiceNotificationService } from '../../ai-employee/voice-notification.service';

/**
 * AI Çalışanım sesli bildirim kanalı.
 * İlgili event'leri Notification Orchestrator'ın sesli çıktısı olarak kuyruğa ekler.
 */
@Injectable()
export class VoiceHandler implements NotificationHandler {
  private readonly logger = new Logger(VoiceHandler.name);
  readonly eventType = 'ORDER_CREATED';

  constructor(private readonly voice: VoiceNotificationService) {}

  async handle(event: SystemEvent): Promise<void> {
    const supported = ['ORDER_CREATED', 'ORDER_UPDATED', 'COMPLAINT_CREATED', 'REQUEST_CREATED', 'SUBSCRIPTION_THRESHOLD', 'SYSTEM_HEALTH_FAILED'];
    if (!supported.includes(event.type)) return;
    this.logger.log(`[voice] handle ${event.type} (tenant=${event.tenantId})`);

    const p = event.payload as Record<string, unknown>;
    // Her yeni siparişte sesli anons (ön ödemeli/havale DAHİL) — esnaf haberdar olsun.
    void p;

    await this.voice.enqueue(event.type, event.tenantId, p, event.entityId);
  }
}