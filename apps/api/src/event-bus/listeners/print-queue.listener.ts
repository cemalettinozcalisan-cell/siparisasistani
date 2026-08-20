import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService, SystemEvents } from '../event-bus.service';
import { SupabaseService } from '../../common/supabase.client';

@Injectable()
export class PrintQueueListener implements OnModuleInit {
  private readonly logger = new Logger(PrintQueueListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly supabase: SupabaseService,
  ) {}

  onModuleInit() {
    // Yazıcı fişleri tek noktadan NotificationService üzerinden yönetilir
    // (ORDER_CREATED + ORDER_PAYMENT_CONFIRMED). Bu dinleyici artık doğrudan yazmaz.
    this.logger.log('PrintQueueListener delegated to NotificationService');
  }

  private async isPrinterEnabled(tenantId: string): Promise<boolean> {
    const { data } = await this.supabase.db
      .from('tenant_settings')
      .select('printer_enabled')
      .eq('tenant_id', tenantId)
      .single();

    return data?.printer_enabled || false;
  }
}
