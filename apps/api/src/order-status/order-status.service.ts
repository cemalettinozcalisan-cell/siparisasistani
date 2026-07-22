import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';
import { TimelineService } from '../timeline/timeline.service';

const STATUS_FLOW: Record<string, { icon: string; description: string; notification: string }> = {
  NEW: { icon: '🆕', description: 'Sipariş alındı', notification: 'Yeni sipariş oluşturuldu' },
  PAYMENT_PENDING: { icon: '⏳', description: 'Ödeme bekleniyor', notification: 'Ödeme bekleniyor' },
  PAYMENT_CONFIRMED: { icon: '✅', description: 'Ödeme onaylandı', notification: 'Ödeme alındı, sipariş hazırlanıyor' },
  PACKAGING: { icon: '📦', description: 'Paketlemeye hazırlanıyor', notification: 'Siparişiniz hazırlanıyor' },
  PACKAGED: { icon: '📦', description: 'Paketlendi', notification: 'Siparişiniz paketlendi' },
  SHIPPED: { icon: '🚚', description: 'Kargoya verildi', notification: 'Siparişiniz kargoya verildi' },
  DELIVERED: { icon: '✅', description: 'Teslim edildi', notification: 'Siparişiniz teslim edildi' },
  COMPLETED: { icon: '🎉', description: 'Tamamlandı', notification: 'Sipariş tamamlandı, afiyet olsun' },
  CANCELLED: { icon: '❌', description: 'İptal edildi', notification: 'Sipariş iptal edildi' },
  REFUNDED: { icon: '💰', description: 'İade yapıldı', notification: 'Para iadesi yapıldı' },
};

@Injectable()
export class OrderStatusService {
  private readonly logger = new Logger(OrderStatusService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventBus: EventBusService,
    private readonly timeline: TimelineService,
  ) {}

  async updateStatus(params: {
    tenantId: string; orderId: string; newStatus: string;
    cargoCompany?: string; trackingNo?: string; trackingUrl?: string;
  }) {
    const { data: order } = await this.supabase.db
      .from('orders')
      .select('id, order_number, status, customer_id, total_price')
      .eq('id', params.orderId)
      .maybeSingle();
    if (!order) throw new Error('Order not found');

    const { data: customer } = await this.supabase.db
      .from('customers')
      .select('name, phone')
      .eq('id', order.customer_id)
      .maybeSingle();

    // Update order status
    await this.supabase.db.from('orders').update({ status: params.newStatus }).eq('id', params.orderId);

    // Save cargo info if provided
    if (params.cargoCompany && params.trackingNo) {
      await this.supabase.db.from('shipments').insert({
        tenant_id: params.tenantId, order_id: params.orderId,
        company: params.cargoCompany, tracking_no: params.trackingNo,
        tracking_url: params.trackingUrl || '', status: 'shipped', shipped_at: new Date().toISOString(),
      });
    }

    // Timeline
    const flow = STATUS_FLOW[params.newStatus];
    const icon = flow?.icon || '📋';
    const desc = flow?.description || `Durum: ${params.newStatus}`;
    const details = params.trackingNo ? ` (${params.cargoCompany} - ${params.trackingNo})` : '';

    const priceStr = order.total_price ? ` (${Number(order.total_price).toLocaleString('tr-TR')} TL)` : '';
    const enrichedDesc = params.newStatus === 'PAYMENT_CONFIRMED' ? `${desc}${priceStr}` : `${desc}${details}`;

    await this.timeline.logEvent({
      tenantId: params.tenantId, entityType: 'order', entityId: params.orderId,
      eventType: `STATUS_${params.newStatus}`,
      description: enrichedDesc,
      metadata: { oldStatus: order.status, newStatus: params.newStatus, orderNumber: order.order_number, customerName: customer?.name },
      channel: 'SYSTEM', actorType: 'STAFF',
    });

    // Event
    const eventType = SystemEvents.STATUS_UPDATED;
    this.eventBus.emit(eventType, params.tenantId, {
      entityType: 'order', orderId: params.orderId,
      orderNumber: order.order_number, status: params.newStatus,
      customerName: customer?.name, customerPhone: customer?.phone,
      totalPrice: order.total_price,
      cargoCompany: params.cargoCompany, trackingNo: params.trackingNo,
      trackingUrl: params.trackingUrl,
      description: `${icon} ${desc}${details}`,
      notification: flow?.notification || desc,
    }, params.orderId);

    this.logger.log(`Order ${order.order_number}: ${order.status} → ${params.newStatus}`);

    return { orderId: params.orderId, orderNumber: order.order_number, status: params.newStatus };
  }
}
