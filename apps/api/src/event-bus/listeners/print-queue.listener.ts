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
    this.eventBus.on(SystemEvents.ORDER_CREATED).subscribe(async (event) => {
      const enabled = await this.isPrinterEnabled(event.tenantId);
      if (!enabled) return;

      this.logger.log(`Print job queued for order ${event.entityId}`);

      await this.supabase.db.from('print_jobs').insert({
        tenant_id: event.tenantId,
        order_id: event.entityId,
        status: 'pending',
        retry_count: 0,
        max_retries: 3,
      });
    });
  }

  private async isPrinterEnabled(tenantId: string): Promise<boolean> {
    const { data } = await this.supabase.db
      .from('settings')
      .select('printer_enabled')
      .eq('tenant_id', tenantId)
      .single();

    return data?.printer_enabled || false;
  }
}
