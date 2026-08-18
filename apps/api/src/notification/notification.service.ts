import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService, SystemEvents, SystemEvent } from '../event-bus/event-bus.service';
import { SupabaseService } from '../common/supabase.client';
import { filter } from 'rxjs';

type NotificationChannel = 'whatsapp_group' | 'printer' | 'activity_log' | 'sms' | 'email';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly supabase: SupabaseService,
  ) {}

  onModuleInit() {
    const orderEvents = [
      SystemEvents.ORDER_CREATED,
      SystemEvents.ORDER_UPDATED,
      SystemEvents.ORDER_SHIPPED,
      SystemEvents.ORDER_CANCELLED,
      SystemEvents.CALLBACK_REQUIRED,
      SystemEvents.HUMAN_REQUIRED,
    ];

    orderEvents.forEach((eventType) => {
      this.eventBus.on(eventType).subscribe((event) => {
        this.route(event);
      });
    });
  }

  private async route(event: SystemEvent) {
    const channels = await this.resolveChannels(event.tenantId);

    const promises = channels.map(async (channel) => {
      try {
        await this.send(channel, event);
      } catch (err) {
        this.logger.error(`Notification failed [${channel}]: ${(err as Error).message}`);
      }
    });

    await Promise.allSettled(promises);
  }

  private async resolveChannels(tenantId: string): Promise<NotificationChannel[]> {
    const channels: NotificationChannel[] = ['activity_log'];

    const { data: settings } = await this.supabase.db
      .from('tenant_settings')
      .select('whatsapp_group_enabled, printer_enabled')
      .eq('tenant_id', tenantId)
      .single();

    if (settings?.whatsapp_group_enabled) channels.push('whatsapp_group');
    if (settings?.printer_enabled) channels.push('printer');

    return channels;
  }

  private async send(channel: NotificationChannel, event: SystemEvent): Promise<void> {
    switch (channel) {
      case 'activity_log':
        await this.supabase.db.from('activity_logs').insert({
          tenant_id: event.tenantId,
          entity_type: (event.payload.entityType as string) || 'system',
          entity_id: event.entityId,
          event_type: event.type,
          description: (event.payload.description as string) || event.type,
          metadata: event.payload,
          actor_type: (event.payload.actorType as string) || 'AI',
          actor_id: (event.payload.actorId as string) || null,
        });
        break;

      case 'whatsapp_group':
        await this.supabase.db.from('ai_events').insert({
          tenant_id: event.tenantId,
          order_id: event.entityId,
          event_type: 'whatsapp_group_sent',
          event_data: {
            type: event.type,
            message: event.payload.description,
            channel: 'whatsapp_group',
            status: 'queued',
          },
        });
        break;

      case 'printer': {
        const isComplaint = (event.payload.entityType as string) === 'complaint';
        const p = event.payload as Record<string, unknown>;
        await this.supabase.db.from('print_jobs').insert({
          tenant_id: event.tenantId,
          order_id: event.entityId,
          status: 'pending',
          retry_count: 0,
          max_retries: 3,
          job_type: isComplaint ? 'complaint' : 'order',
          payload: isComplaint ? {
            ticketNumber: p.ticketNumber || '',
            customerName: p.customerName || '',
            customerPhone: p.customerPhone || '',
            severity: p.severity || 'NORMAL',
            description: p.description || '',
            channel: p.channel || 'VOICE',
          } : null,
        });
        break;
      }
    }
  }
}
