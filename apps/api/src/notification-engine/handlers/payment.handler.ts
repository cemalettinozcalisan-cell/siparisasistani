import { Injectable } from '@nestjs/common';
import { NotificationHandler } from './base.handler';
import { SystemEvent } from '../../event-bus/event-bus.service';
import { SupabaseService } from '../../common/supabase.client';

@Injectable()
export class PaymentHandler implements NotificationHandler {
  readonly eventType = 'PAYMENT_EVENT';

  constructor(private readonly supabase: SupabaseService) {}

  async handle(event: SystemEvent): Promise<void> {
    const p = event.payload as Record<string, unknown>;
    const subType = (p.eventSubType as string) || event.type;

    switch (subType) {
      case 'PAYMENT_CREATED':
        await this.handleCreated(event, p);
        break;
      case 'PAYMENT_LINK_SENT':
        await this.handleLinkSent(event, p);
        break;
      case 'PAYMENT_RECEIVED':
        await this.handleReceived(event, p);
        break;
      case 'PAYMENT_FAILED':
        await this.handleFailed(event, p);
        break;
      case 'PAYMENT_REFUNDED':
        await this.handleRefunded(event, p);
        break;
    }
  }

  private async handleCreated(event: SystemEvent, p: Record<string, unknown>) {
    await this.supabase.db.from('notifications').insert({
      tenant_id: event.tenantId,
      type: 'payment',
      title: '💳 Ödeme Oluşturuldu',
      message: `#${p.orderNumber || ''} - ${p.method || 'IBAN'} - ${p.amount ? Number(p.amount).toLocaleString('tr-TR') + ' TL' : ''}`,
      status: 'unread',
    });
  }

  private async handleLinkSent(event: SystemEvent, p: Record<string, unknown>) {
    await this.supabase.db.from('notifications').insert({
      tenant_id: event.tenantId,
      type: 'payment',
      title: '🔗 Ödeme Linki Gönderildi',
      message: `#${p.orderNumber || ''} - ${p.linkUrl || ''}`,
      status: 'unread',
    });
  }

  private async handleReceived(event: SystemEvent, p: Record<string, unknown>) {
    await this.supabase.db.from('notifications').insert({
      tenant_id: event.tenantId,
      type: 'payment',
      title: '✅ Ödeme Alındı',
      message: `#${p.orderNumber || ''} - ${p.amount ? Number(p.amount).toLocaleString('tr-TR') + ' TL' : ''}`,
      status: 'unread',
    });
  }

  private async handleFailed(event: SystemEvent, p: Record<string, unknown>) {
    await this.supabase.db.from('notifications').insert({
      tenant_id: event.tenantId,
      type: 'payment',
      title: '❌ Ödeme Başarısız',
      message: `#${p.orderNumber || ''} - ${p.reason || 'Bilinmiyor'}`,
      status: 'unread',
    });
  }

  private async handleRefunded(event: SystemEvent, p: Record<string, unknown>) {
    await this.supabase.db.from('notifications').insert({
      tenant_id: event.tenantId,
      type: 'payment',
      title: '💰 İade Yapıldı',
      message: `#${p.orderNumber || ''} - ${p.amount ? Number(p.amount).toLocaleString('tr-TR') + ' TL' : ''}`,
      status: 'unread',
    });
  }
}
