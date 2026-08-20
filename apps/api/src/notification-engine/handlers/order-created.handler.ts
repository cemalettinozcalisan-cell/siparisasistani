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

    // Ön ödemeli siparişte (IBAN/link) "Yeni Sipariş" bildirimi ödeme onayına kadar bekler
    if (event.type === 'ORDER_CREATED' && p.esnafNotify === false) return;

    if (event.type === 'ORDER_PAYMENT_CONFIRMED') {
      await this.supabase.db.from('notifications').insert({
        tenant_id: event.tenantId,
        type: 'new_order',
        title: '🆕 Yeni Sipariş + 💳 Ödeme',
        message: `#${p.orderNumber} - ${p.customerName || 'Bilinmiyor'} - ${p.paymentNote || 'Ödeme alındı'} - ${p.totalPrice ? Number(p.totalPrice).toLocaleString('tr-TR') + ' TL' : ''}`,
        status: 'unread',
      });
      return;
    }

    await this.supabase.db.from('notifications').insert({
      tenant_id: event.tenantId,
      type: 'new_order',
      title: '🆕 Yeni Sipariş',
      message: `#${p.orderNumber} - ${p.customerName || 'Bilinmiyor'} - ${p.totalPrice || '?'} TL`,
      status: 'unread',
    });
  }
}
