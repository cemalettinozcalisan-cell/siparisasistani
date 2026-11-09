import { Injectable } from '@nestjs/common';
import { NotificationHandler } from './base.handler';
import { SystemEvent } from '../../event-bus/event-bus.service';
import { SupabaseService } from '../../common/supabase.client';

/** Panel kırmızı zili: sipariş iptali ve iptal talebi. */
@Injectable()
export class OrderCancelledHandler implements NotificationHandler {
  readonly eventType = 'ORDER_CANCELLED';

  constructor(private readonly supabase: SupabaseService) {}

  async handle(event: SystemEvent): Promise<void> {
    const p = event.payload as Record<string, unknown>;
    if (p.mock) return;
    const requested = event.type === 'ORDER_CANCEL_REQUESTED';
    const orderNumber = p.orderNumber ? `#${String(p.orderNumber)}` : '';
    const message = [
      orderNumber,
      p.customerName ? String(p.customerName) : '',
      requested ? 'Müşteri iptal talebi' : 'Sipariş iptal edildi',
    ]
      .filter(Boolean)
      .join(' - ');

    await this.supabase.db.from('notifications').insert({
      tenant_id: event.tenantId,
      type: 'new_order',
      title: requested ? '⚠️ İptal Talebi' : '❌ Sipariş İptal Edildi',
      message: message || (requested ? 'Bir iptal talebi var' : 'Bir sipariş iptal edildi'),
      status: 'unread',
    });
  }
}
