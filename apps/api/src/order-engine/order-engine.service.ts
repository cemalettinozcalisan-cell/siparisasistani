import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { AiOrderInput, OrderResult } from '@siparis/types';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';
import { WhatsAppConversationsService } from '../whatsapp/conversations/conversations.service';

@Injectable()
export class OrderEngineService {
  private readonly logger = new Logger(OrderEngineService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventBus: EventBusService,
    private readonly whatsapp: WhatsAppConversationsService,
  ) {}

  async process(input: AiOrderInput, tenantId: string): Promise<OrderResult> {
    const steps = {
      customerResolution: async () => this.resolveCustomer(input, tenantId),
      orderCreation: async (customerId: string) =>
        this.createOrder(input, tenantId, customerId),
    };

    const customer = await steps.customerResolution();
    const order = await steps.orderCreation(customer.id);

    return order;
  }

  private async resolveCustomer(
    input: AiOrderInput,
    tenantId: string,
  ) {
    const { data: existing } = await this.supabase.db
      .from('customers')
      .select('id, name, phone')
      .eq('tenant_id', tenantId)
      .eq('phone', input.customer.phone)
      .maybeSingle();

    if (existing) {
      this.logger.log(`Existing customer: ${existing.id}`);
      return existing;
    }

    const { data: created, error } = await this.supabase.db
      .from('customers')
      .insert({
        tenant_id: tenantId,
        name: input.customer.name,
        phone: input.customer.phone,
        address: input.customer.address || null,
        city: input.customer.city || null,
      })
      .select('id, name, phone')
      .single();

    if (error) {
      this.logger.error(`Customer creation failed: ${error.message}`);
      throw new Error(`Customer creation failed: ${error.message}`);
    }

    this.logger.log(`New customer created: ${created.id}`);
    return created;
  }

  private async createOrder(
    input: AiOrderInput,
    tenantId: string,
    customerId: string,
  ): Promise<OrderResult> {
    const orderNumber = await this.generateOrderNumber(tenantId);
    const totalPrice = await this.calculateTotal(input, tenantId);

    const sourceMap: Record<string, string> = { phone: 'PHONE', whatsapp: 'WHATSAPP', sms: 'SMS', manual: 'PANEL' };
    const source = input.source || sourceMap[input.channel] || 'PANEL';

    const { data: order, error: orderError } = await this.supabase.db
      .from('orders')
      .insert({
        tenant_id: tenantId,
        customer_id: customerId,
        order_number: orderNumber,
        channel: input.channel,
        source,
        status: 'new',
        payment_method: input.payment,
        payment_status: 'waiting',
        total_price: totalPrice,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (orderError) {
      this.logger.error(`Order creation failed: ${orderError.message}`);
      throw new Error(`Order creation failed: ${orderError.message}`);
    }

    await this.createOrderItems(order.id, input.products, tenantId);
    await this.createNotification(tenantId, order.id, orderNumber, totalPrice);
    await this.logAiEvent(tenantId, order.id, 'order_received', {
      confidence: input.confidence,
      channel: input.channel,
      products: input.products.length,
    });

    if (input.confidence < 70) {
      await this.logAiEvent(tenantId, order.id, 'order_failed', {
        reason: 'low_confidence',
        confidence: input.confidence,
      });
    }

    this.eventBus.emit(SystemEvents.ORDER_CREATED, tenantId, {
      entityType: 'order',
      orderId: order.id,
      orderNumber,
      totalPrice,
      customerId,
      confidence: input.confidence,
      channel: input.channel,
      description: `#${orderNumber} - ${totalPrice.toLocaleString('tr-TR')} TL`,
      productCount: input.products.length,
    }, order.id);

    return {
      order_id: order.id,
      order_number: orderNumber,
      tenant_id: tenantId,
      customer_id: customerId,
      total_price: totalPrice,
      status: 'new',
      confidence: input.confidence,
    };
  }

  private async createOrderItems(
    orderId: string,
    products: AiOrderInput['products'],
    tenantId: string,
  ) {
    const items = await Promise.all(
      products.map(async (p) => {
        const { data: product } = await this.supabase.db
          .from('products')
          .select('id, price')
          .eq('tenant_id', tenantId)
          .eq('product_name', p.product_name)
          .maybeSingle();

        const unitPrice = product ? Number(product.price) : 0;
        return {
          order_id: orderId,
          product_id: product?.id || null,
          product_name: p.product_name,
          quantity: p.quantity,
          unit: p.unit,
          unit_price: unitPrice,
          total: unitPrice * p.quantity,
        };
      }),
    );

    const { error } = await this.supabase.db
      .from('order_items')
      .insert(items);

    if (error) {
      this.logger.error(`Order items creation failed: ${error.message}`);
    }
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const yearPrefix = new Date().getFullYear().toString().slice(-2);

    const { data: lastOrder } = await this.supabase.db
      .from('orders')
      .select('order_number')
      .eq('tenant_id', tenantId)
      .like('order_number', `${yearPrefix}-%`)
      .order('order_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    let seq = 1;
    if (lastOrder) {
      const parts = lastOrder.order_number.split('-');
      seq = parseInt(parts[1], 10) + 1;
    }

    return `${yearPrefix}-${seq.toString().padStart(5, '0')}`;
  }

  private async calculateTotal(
    input: AiOrderInput,
    tenantId: string,
  ): Promise<number> {
    let total = 0;

    for (const p of input.products) {
      const { data: product } = await this.supabase.db
        .from('products')
        .select('price')
        .eq('tenant_id', tenantId)
        .eq('product_name', p.product_name)
        .maybeSingle();

      const price = product ? Number(product.price) : 0;
      total += price * p.quantity;
    }

    return total;
  }

  private async createNotification(
    tenantId: string,
    orderId: string,
    orderNumber: string,
    totalPrice: number,
  ) {
    await this.supabase.db.from('notifications').insert({
      tenant_id: tenantId,
      type: 'new_order',
      title: 'Yeni Sipariş',
      message: `Sipariş #${orderNumber} - ${totalPrice.toLocaleString('tr-TR')} TL`,
      status: 'unread',
    });
  }

  private async logAiEvent(
    tenantId: string,
    orderId: string,
    eventType: string,
    eventData: Record<string, unknown>,
  ) {
    await this.supabase.db.from('ai_events').insert({
      tenant_id: tenantId,
      order_id: orderId,
      event_type: eventType,
      event_data: eventData,
    });
  }

  async updateStatus(orderId: string, status: string): Promise<void> {
    const { data: order, error: fetchError } = await this.supabase.db
      .from('orders')
      .select('tenant_id, order_number')
      .eq('id', orderId)
      .single();

    if (fetchError) throw new Error(`Order fetch failed: ${fetchError.message}`);

    const { error } = await this.supabase.db
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      this.logger.error(`Status update failed: ${error.message}`);
      throw new Error(`Status update failed: ${error.message}`);
    }

    if (status === 'shipped') {
      this.eventBus.emit(SystemEvents.ORDER_SHIPPED, order.tenant_id, {
        entityType: 'order',
        orderId,
        description: `Sipariş #${order.order_number} kargoya verildi`,
      }, orderId);
    }

    this.eventBus.emit(SystemEvents.ORDER_UPDATED, order.tenant_id, {
      entityType: 'order',
      orderId,
      newStatus: status,
      description: `Sipariş durumu: ${status}`,
    }, orderId);
  }

  async cancelOrder(orderId: string): Promise<void> {
    const { data: order } = await this.supabase.db
      .from('orders')
      .select('tenant_id, order_number')
      .eq('id', orderId)
      .single();

    await this.updateStatus(orderId, 'cancelled');

    if (order) {
      this.eventBus.emit(SystemEvents.ORDER_CANCELLED, order.tenant_id, {
        entityType: 'order',
        orderId,
        description: `Sipariş #${order.order_number} iptal edildi`,
      }, orderId);
    }
  }

  async updateCargo(orderId: string, cargoCompany: string, trackingNumber: string): Promise<void> {
    const { data: order } = await this.supabase.db
      .from('orders')
      .select('tenant_id, order_number, customer_phone, customer_id, id')
      .eq('id', orderId)
      .single();

    if (!order) throw new Error('Order not found');

    await this.supabase.db
      .from('orders')
      .update({
        cargo_company: cargoCompany,
        tracking_number: trackingNumber,
        status: 'SHIPPED',
      })
      .eq('id', orderId);

    const orderData = order as Record<string, unknown>;
    const tenantId = orderData.tenant_id as string;

    // Timeline event
    await this.supabase.db.from('activity_logs').insert({
      tenant_id: tenantId,
      entity_type: 'order',
      entity_id: orderId,
      event_type: 'STATUS_SHIPPED',
      actor_type: 'STAFF',
      channel: 'SYSTEM',
      description: `Kargo bilgisi girildi: ${cargoCompany} - ${trackingNumber}`,
      metadata: { cargo_company: cargoCompany, tracking_number: trackingNumber },
    });

    // Send WhatsApp notification to customer
    const { data: customer } = await this.supabase.db
      .from('customers')
      .select('name, phone')
      .eq('id', orderData.customer_id)
      .single();

    if (customer) {
      const customerName = (customer as any).name || 'Değerli Müşterimiz';
      const customerPhone = (customer as any).phone;
      const message = `Merhaba ${customerName}, #${orderData.order_number} nolu siparişiniz kargoya verilmiştir.\nKargo Firması: ${cargoCompany}\nTakip No: ${trackingNumber}\n\nSiparişAsistanı`;

      if (customerPhone) {
        try {
          const convId = await this.whatsapp.findOrCreate(tenantId, customerPhone);
          await this.whatsapp.addMessage({ tenantId, conversationId: convId, direction: 'outgoing', body: message });
        } catch {}
      }
    }

    this.eventBus.emit(SystemEvents.ORDER_SHIPPED, tenantId, {
      entityType: 'order',
      orderId,
      cargoCompany,
      trackingNumber,
      description: `Sipariş #${orderData.order_number} kargoya verildi - ${cargoCompany} (${trackingNumber})`,
    }, orderId);
  }
}
