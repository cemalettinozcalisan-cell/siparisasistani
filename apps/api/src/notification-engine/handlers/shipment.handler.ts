import { Injectable } from '@nestjs/common';
import { NotificationHandler } from './base.handler';
import { SystemEvent } from '../../event-bus/event-bus.service';
import { SupabaseService } from '../../common/supabase.client';

@Injectable()
export class ShipmentHandler implements NotificationHandler {
  readonly eventType = 'STATUS_UPDATED';

  constructor(private readonly supabase: SupabaseService) {}

  async handle(event: SystemEvent): Promise<void> {
    const p = event.payload as Record<string, unknown>;
    const status = p.status as string;

    if (status === 'SHIPPED') {
      await this.supabase.db.from('notifications').insert({
        tenant_id: event.tenantId,
        type: 'cargo',
        title: '🚚 Kargoya Verildi',
        message: `${p.cargoCompany || ''} - ${p.trackingNo || ''}`,
        status: 'unread',
      });
    } else if (status === 'DELIVERED') {
      await this.supabase.db.from('notifications').insert({
        tenant_id: event.tenantId,
        type: 'cargo',
        title: '✅ Teslim Edildi',
        message: 'Sipariş teslim edildi, afiyet olsun',
        status: 'unread',
      });
    } else if (status === 'PAYMENT_CONFIRMED') {
      await this.supabase.db.from('notifications').insert({
        tenant_id: event.tenantId,
        type: 'payment',
        title: '✅ Ödeme Alındı',
        message: `#${p.orderNumber || ''} - Ödeme onaylandı`,
        status: 'unread',
      });
    }
  }
}
