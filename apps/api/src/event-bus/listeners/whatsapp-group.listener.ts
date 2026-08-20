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
    // Esnaf grubu bildirimleri tek noktadan NotificationService üzerinden yönetilir
    // (ORDER_CREATED + ORDER_PAYMENT_CONFIRMED). Bu dinleyici artık doğrudan yazmaz.
    this.logger.log('WhatsAppGroupListener delegated to NotificationService');
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
