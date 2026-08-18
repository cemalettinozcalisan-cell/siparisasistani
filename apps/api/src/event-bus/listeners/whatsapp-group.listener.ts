import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService, SystemEvents } from '../event-bus.service';
import { SupabaseService } from '../../common/supabase.client';

@Injectable()
export class WhatsAppGroupListener implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppGroupListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly supabase: SupabaseService,
  ) {}

  onModuleInit() {
    this.eventBus.on(SystemEvents.ORDER_CREATED).subscribe(async (event) => {
      const enabled = await this.isWhatsAppGroupEnabled(event.tenantId);
      if (!enabled) return;

      this.logger.log(`WhatsApp group notification for order ${event.entityId}`);

      await this.supabase.db.from('ai_events').insert({
        tenant_id: event.tenantId,
        order_id: event.entityId,
        event_type: 'whatsapp_group_sent',
        event_data: {
          message: `🆕 Yeni Sipariş #${event.payload.orderNumber}\n${event.payload.description}`,
          status: 'queued',
        },
      });
    });
  }

  private async isWhatsAppGroupEnabled(tenantId: string): Promise<boolean> {
    const { data } = await this.supabase.db
      .from('tenant_settings')
      .select('whatsapp_group_enabled')
      .eq('tenant_id', tenantId)
      .single();

    return data?.whatsapp_group_enabled || false;
  }
}
