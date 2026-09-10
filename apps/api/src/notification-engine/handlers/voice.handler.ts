import { Injectable } from '@nestjs/common';
import { NotificationHandler } from './base.handler';
import { SystemEvent } from '../../event-bus/event-bus.service';
import { VoiceNotificationService } from '../../ai-employee/voice-notification.service';

/**
 * AI Çalışanım sesli bildirim kanalı.
 * İlgili event'leri Notification Orchestrator'ın sesli çıktısı olarak kuyruğa ekler.
 */
@Injectable()
export class VoiceHandler implements NotificationHandler {
  readonly eventType = 'ORDER_CREATED';

  constructor(private readonly voice: VoiceNotificationService) {}

  async handle(event: SystemEvent): Promise<void> {
    const supported = ['ORDER_CREATED', 'COMPLAINT_CREATED', 'REQUEST_CREATED', 'SUBSCRIPTION_THRESHOLD', 'SYSTEM_HEALTH_FAILED'];
    if (!supported.includes(event.type)) return;

    const p = event.payload as Record<string, unknown>;
    // Ön ödemeli siparişte "yeni sipariş" bildirimi ödeme onayına kadar bekler (mevcut davranışla uyumlu)
    if (event.type === 'ORDER_CREATED' && p.esnafNotify === false) return;

    await this.voice.enqueue(event.type, event.tenantId, p, event.entityId);
  }
}