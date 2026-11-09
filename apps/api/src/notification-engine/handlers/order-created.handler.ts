import { Injectable } from '@nestjs/common';
import { NotificationHandler } from './base.handler';
import { SystemEvent } from '../../event-bus/event-bus.service';
import { SupabaseService } from '../../common/supabase.client';

@Injectable()
export class OrderCreatedHandler implements NotificationHandler {
  readonly eventType = 'ORDER_CREATED';

  constructor(private readonly supabase: SupabaseService) {}

  async handle(event: SystemEvent): Promise<void> {
    const p = event.payload as Record<string, unknown>;

    // Her yeni siparişte zil bildirimi (ön ödemeli/havale DAHİL).

    if (event.type === 'ORDER_PAYMENT_CONFIRMED') {
      await this.supabase.db.from('notifications').insert({
        tenant_id: event.tenantId,
        type: 'new_order',
        title: '💰 Ödeme Tamamlandı',
        message: `#${p.orderNumber} - ${p.customerName || 'Bilinmiyor'} - ${p.paymentNote || 'Havale ödemesi tamamlandı'} - ${p.totalPrice ? Number(p.totalPrice).toLocaleString('tr-TR') + ' TL' : ''}`,
        status: 'unread',
      });
      return;
    }

    const payment = String(p.paymentMethod || '').toLowerCase();
    const iban = payment === 'iban' || payment === 'havale';
    await this.supabase.db.from('notifications').insert({
      tenant_id: event.tenantId,
      type: 'new_order',
      title: iban ? '🛒 Yeni Sipariş (Ödeme Bekliyor)' : '🛒 Yeni Sipariş',
      message: `#${p.orderNumber} - ${p.customerName || 'Bilinmiyor'} - ${p.totalPrice ? Number(p.totalPrice).toLocaleString('tr-TR') + ' TL' : '?'}${iban ? ' - Havale/IBAN ödemesi bekliyor' : ''}`,
      status: 'unread',
    });
  }
}
