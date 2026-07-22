import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';
import { TimelineService } from '../timeline/timeline.service';

export interface PaymentRequest {
  tenantId: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  preferredMethod?: string;
}

export interface PaymentResult {
  paymentId: string;
  method: string;
  status: string;
  instructions: string;
}

@Injectable()
export class PaymentEngineService implements OnModuleInit {
  private readonly logger = new Logger(PaymentEngineService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventBus: EventBusService,
    private readonly timeline: TimelineService,
  ) {}

  onModuleInit() {
    this.eventBus.on(SystemEvents.ORDER_CREATED).subscribe((event) => {
      const payload = event.payload as Record<string, unknown>;
      this.handleOrderCreated(event.tenantId, event.entityId || '', payload).catch((err) => {
        this.logger.error(`PaymentEngine handler failed: ${err.message}`);
      });
    });
    this.logger.log('PaymentEngine started');
  }

  async handleOrderCreated(tenantId: string, orderId: string, payload: Record<string, unknown>) {
    try {
      if (!orderId) return;

      const { data: order } = await this.supabase.db
        .from('orders')
        .select('id, order_number, total_price, customer_id')
        .eq('id', orderId)
        .maybeSingle();

      if (!order) return;

      const { data: customer } = await this.supabase.db
        .from('customers')
        .select('name, phone')
        .eq('id', order.customer_id)
        .maybeSingle();

      const { data: tenant } = await this.supabase.db
        .from('tenants')
        .select('iban, company_name')
        .eq('id', tenantId)
        .maybeSingle();

      const { data: settings } = await this.supabase.db
        .from('tenant_settings')
        .select('iban_enabled, payment_link_enabled, website_redirect_enabled, website_url')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      const paymentMethods: string[] = [];
      if (settings?.iban_enabled && tenant?.iban) paymentMethods.push('IBAN');
      if (settings?.payment_link_enabled) paymentMethods.push('PAYMENT_LINK');
      if (settings?.website_redirect_enabled) paymentMethods.push('WEBSITE');

      const preferred = (payload.payment as string) || 'IBAN';
      const method = paymentMethods.includes(preferred) ? preferred : (paymentMethods[0] || 'IBAN');

      const paymentId = crypto.randomUUID();
      let instructions = '';

      if (method === 'IBAN' && tenant?.iban) {
        instructions = `IBAN: ${tenant.iban}\nAçıklama: ${order.order_number}\nTutar: ${Number(order.total_price).toLocaleString('tr-TR')} TL`;
        await this.createPaymentRecord(tenantId, orderId, paymentId, 'IBAN', order.total_price);

        await this.timeline.logEvent({
          tenantId, entityType: 'payment', entityId: paymentId,
          eventType: 'PAYMENT_WAITING',
          description: `💳 IBAN gönderildi: ${tenant.iban} (Açıklama: ${order.order_number})`,
          metadata: { method: 'IBAN', iban: tenant.iban, totalPrice: order.total_price, orderNumber: order.order_number },
          channel: 'SYSTEM', actorType: 'AI',
        });

        this.eventBus.emit(SystemEvents.PAYMENT_CREATED, tenantId, {
          entityType: 'payment', paymentId, orderId,
          orderNumber: order.order_number, method: 'IBAN',
          amount: order.total_price, eventSubType: 'PAYMENT_CREATED',
          description: `IBAN oluşturuldu: ${order.order_number}`,
        }, orderId);
      }

      this.logger.log(`Payment initiated: ${method} for order ${order.order_number}`);
    } catch (err) {
      this.logger.error(`Payment engine failed: ${(err as Error).message}`);
    }
  }

  async confirmPayment(paymentId: string, transactionId?: string): Promise<void> {
    await this.supabase.db
      .from('payments')
      .update({ status: 'paid', transaction_id: transactionId || null, transaction_date: new Date().toISOString() })
      .eq('id', paymentId);

    const { data: payment } = await this.supabase.db
      .from('payments')
      .select('tenant_id, order_id, amount')
      .eq('id', paymentId)
      .maybeSingle();

    if (payment) {
      await this.supabase.db
        .from('orders')
        .update({ payment_status: 'paid', status: 'PAYMENT_CONFIRMED' })
        .eq('id', payment.order_id);

      await this.timeline.logEvent({
        tenantId: payment.tenant_id, entityType: 'payment', entityId: paymentId,
        eventType: 'PAYMENT_CONFIRMED',
        description: `✅ Ödeme onaylandı: ${Number(payment.amount).toLocaleString('tr-TR')} TL`,
        metadata: { amount: payment.amount, transactionId },
        channel: 'SYSTEM', actorType: 'SYSTEM',
      });

      this.eventBus.emit(SystemEvents.PAYMENT_RECEIVED, payment.tenant_id, {
        entityType: 'payment', paymentId, orderId: payment.order_id, amount: payment.amount,
        orderNumber: '', eventSubType: 'PAYMENT_RECEIVED',
        description: `Ödeme alındı: ${Number(payment.amount).toLocaleString('tr-TR')} TL`,
      }, payment.order_id);
    }
  }

  private async createPaymentRecord(tenantId: string, orderId: string, paymentId: string, method: string, amount: number) {
    await this.supabase.db.from('payments').insert({
      id: paymentId, tenant_id: tenantId, order_id: orderId,
      method, status: 'pending', amount,
    });
  }
}
