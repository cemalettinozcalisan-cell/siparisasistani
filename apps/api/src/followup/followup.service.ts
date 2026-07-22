import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';
import { TimelineService } from '../timeline/timeline.service';

interface FollowUpRule {
  triggerEvent: string;
  delayMinutes: number;
  actionType: string;
  message: string;
  channel: string;
}

const RULES: FollowUpRule[] = [
  {
    triggerEvent: 'STATUS_NEW',
    delayMinutes: 30,
    actionType: 'PAYMENT_REMINDER',
    message: '⏰ Ödeme Hatırlatması\n{name} Bey/Hanım, #{orderNumber} numaralı siparişiniz ödeme beklemektedir. Ödemenizi tamamladığınızda siparişiniz hazırlanmaya başlayacaktır.',
    channel: 'whatsapp',
  },
  {
    triggerEvent: 'STATUS_DELIVERED',
    delayMinutes: 2880,
    actionType: 'SATISFACTION_CHECK',
    message: '📝 Memnuniyet Anketi\n{name} Bey/Hanım, siparişiniz teslim edildi. Ürünlerden memnun kaldınız mı? Görüşleriniz bizim için değerli.',
    channel: 'whatsapp',
  },
  {
    triggerEvent: 'STATUS_DELIVERED',
    delayMinutes: 43200,
    actionType: 'REORDER_INVITE',
    message: '🔄 Tekrar Sipariş\n{name} Bey/Hanım, son siparişinizin üzerinden bir ay geçti. Yeni ürünlerimizi keşfetmek ister misiniz?',
    channel: 'whatsapp',
  },
];

@Injectable()
export class FollowUpService implements OnModuleInit {
  private readonly logger = new Logger(FollowUpService.name);
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventBus: EventBusService,
    private readonly timeline: TimelineService,
  ) {}

  onModuleInit() {
    this.checkInterval = setInterval(() => this.processFollowUps(), 60000);
    this.logger.log(`FollowUpEngine started with ${RULES.length} rules`);
  }

  private async processFollowUps() {
    try {
      for (const rule of RULES) {
        const cutoff = new Date(Date.now() - rule.delayMinutes * 60000).toISOString();

        const { data: events } = await this.supabase.db
          .from('activity_logs')
          .select('tenant_id, entity_id, metadata, created_at, description')
          .eq('event_type', rule.triggerEvent)
          .gte('created_at', cutoff)
          .lt('created_at', new Date(Date.now() - (rule.delayMinutes - 1) * 60000).toISOString())
          .limit(10);

        if (!events || events.length === 0) continue;

        for (const event of events) {
          const meta = event.metadata as Record<string, unknown> || {};
          const orderNumber = meta.orderNumber || '';
          const customerName = meta.customerName || 'Değerli';

          // Check if follow-up already sent
          const { data: existing } = await this.supabase.db
            .from('activity_logs')
            .select('id')
            .eq('entity_id', event.entity_id)
            .eq('event_type', `FOLLOWUP_${rule.actionType}`)
            .maybeSingle();
          if (existing) continue;

          // Send follow-up
          const message = rule.message
            .replace('{name}', customerName as string)
            .replace('{orderNumber}', orderNumber as string);

          await this.supabase.db.from('ai_events').insert({
            tenant_id: event.tenant_id,
            event_type: 'followup_notification',
            event_data: {
              type: rule.actionType, message, channel: rule.channel,
              order_id: event.entity_id, status: 'queued',
            },
          });

          // Log to timeline
          await this.timeline.logEvent({
            tenantId: event.tenant_id,
            entityType: 'followup',
            entityId: event.entity_id || undefined,
            eventType: `FOLLOWUP_${rule.actionType}`,
            description: `🔔 ${rule.actionType === 'PAYMENT_REMINDER' ? 'Ödeme hatırlatması gönderildi' : rule.actionType === 'SATISFACTION_CHECK' ? 'Memnuniyet anketi gönderildi' : 'Tekrar sipariş daveti gönderildi'}`,
            metadata: { rule: rule.actionType, message, orderNumber },
            channel: 'SYSTEM',
            actorType: 'SYSTEM',
          });

          this.logger.log(`Follow-up ${rule.actionType} for order ${orderNumber}`);
        }
      }
    } catch (err) {
      this.logger.error(`FollowUpEngine error: ${(err as Error).message}`);
    }
  }
}
