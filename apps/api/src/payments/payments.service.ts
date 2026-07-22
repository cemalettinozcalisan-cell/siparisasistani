import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(params: {
    tenantId: string;
    orderId: string;
    method: string;
    amount: number;
    transactionId?: string;
  }) {
    const { data, error } = await this.supabase.db
      .from('payments')
      .insert({
        tenant_id: params.tenantId,
        order_id: params.orderId,
        method: params.method,
        status: 'pending',
        amount: params.amount,
        transaction_id: params.transactionId || null,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Payment creation failed: ${error.message}`);
      throw new Error(`Payment creation failed: ${error.message}`);
    }

    return data;
  }

  async confirm(paymentId: string, transactionId?: string): Promise<void> {
    await this.supabase.db
      .from('payments')
      .update({
        status: 'paid',
        transaction_id: transactionId || undefined,
        transaction_date: new Date().toISOString(),
      })
      .eq('id', paymentId);

    const { data: payment } = await this.supabase.db
      .from('payments')
      .select('tenant_id, order_id, amount')
      .eq('id', paymentId)
      .single();

    if (payment) {
      await this.supabase.db
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', payment.order_id);

      this.eventBus.emit(SystemEvents.PAYMENT_RECEIVED, payment.tenant_id, {
        entityType: 'payment',
        paymentId,
        orderId: payment.order_id,
        amount: payment.amount,
        description: `Ödeme alındı: ${Number(payment.amount).toLocaleString('tr-TR')} TL`,
      }, payment.order_id);
    }
  }

  async getByOrder(orderId: string) {
    const { data } = await this.supabase.db
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    return data || [];
  }

  async getPaymentSummary(orderId: string) {
    const payments = await this.getByOrder(orderId);
    const totalPaid = payments
      .filter((p: { status: string }) => p.status === 'paid')
      .reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);

    return { payments, totalPaid };
  }
}
