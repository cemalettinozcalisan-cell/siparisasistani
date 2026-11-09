import { Injectable } from '@nestjs/common';
import { NotificationHandler } from './base.handler';
import { SystemEvent } from '../../event-bus/event-bus.service';
import { SupabaseService } from '../../common/supabase.client';

/** Panel kırmızı zil bildirimi: sipariş güncellendi. */
@Injectable()
export class OrderUpdatedHandler implements NotificationHandler {
  readonly eventType = 'ORDER_UPDATED';

  constructor(private readonly supabase: SupabaseService) {}

  async handle(event: SystemEvent): Promise<void> {
    const p = event.payload as Record<string, unknown>;
    if (p.mock) return;
    const orderNumber = p.orderNumber ? `#${String(p.orderNumber)}` : '';
    const total =
      p.totalPrice != null
        ? `Yeni tutar: ${Number(p.totalPrice).toLocaleString('tr-TR')} TL`
        : '';
    const detail = String(p.changeSummary || p.description || 'Sipariş güncellendi');
    const message = [orderNumber, p.customerName ? String(p.customerName) : '', detail, total]
      .filter(Boolean)
      .join(' - ');

    await this.supabase.db.from('notifications').insert({
      tenant_id: event.tenantId,
      type: 'new_order',
      title: '✏️ Sipariş Güncellendi',
      message: message || 'Bir sipariş güncellendi',
      status: 'unread',
    });
  }
}
