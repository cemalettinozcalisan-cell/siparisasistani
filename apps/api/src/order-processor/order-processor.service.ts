import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';
import { TimelineService } from '../timeline/timeline.service';

export interface AiOrderOutput {
  tenantId: string;
  customer: { name?: string; phone?: string; birthday?: string; company_name?: string; identity_number?: string };
  products: { product_name: string; quantity: number; unit: string }[];
  address?: string;
  payment?: string;
  totalPrice?: number;
  conversationConfidence?: number;
  orderConfidence?: number;
  campaignId?: string;
  phone?: string;
  channel: string;
  sessionId?: string;
  source?: string;
}

export interface OrderResult {
  orderId: string;
  orderNumber: string;
  customerId: string;
  totalPrice: number;
  status: string;
}

@Injectable()
export class OrderProcessorService {
  private readonly logger = new Logger(OrderProcessorService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventBus: EventBusService,
    private readonly timeline: TimelineService,
  ) {}

  async process(input: AiOrderOutput): Promise<OrderResult> {
    // 1. Find or create customer
    const customerId = await this.resolveCustomer(input.tenantId, input.customer, input.phone);

    // 1.5 Save birthday if provided
    if (input.customer?.birthday) {
      try {
        await this.supabase.db.from('customers')
          .update({ birth_date: `2000-${input.customer.birthday}` })
          .eq('id', customerId)
          .is('birth_date', null);
      } catch (e) { this.logger.error('Failed to update customer birthday', e); }
    }

    // 1.6 Save company/identity info if provided
    const updateFields: Record<string, unknown> = {};
    if (input.customer?.company_name) updateFields.company_name = input.customer.company_name;
    if (input.customer?.identity_number) updateFields.identity_number = input.customer.identity_number;
    if (Object.keys(updateFields).length > 0) {
      try {
        await this.supabase.db.from('customers').update(updateFields).eq('id', customerId);
      } catch (e) { this.logger.error('Failed to update customer company/identity', e); }
    }

    // 2. Generate order number
    const orderNumber = await this.generateOrderNumber(input.tenantId);

    // 3. Calculate total from DB prices (not AI's estimate)
    const totalPrice = await this.calculateTotal(input.tenantId, input.products, input.source);

    // 4. Create order
    const { data: order, error: orderError } = await this.supabase.db
      .from('orders')
      .insert({
        tenant_id: input.tenantId,
        customer_id: customerId,
        order_number: orderNumber,
        channel: input.channel || 'phone',
        source: input.source || (input.channel === 'phone' ? 'PHONE' : input.channel === 'whatsapp' ? 'WHATSAPP' : input.channel === 'sms' ? 'SMS' : 'PANEL'),
        status: 'new',
        payment_method: this.mapPayment(input.payment),
        payment_status: this.mapPayment(input.payment) === 'iban' ? 'awaiting_dekont' : 'waiting',
        total_price: totalPrice,
        notes: input.source === 'WHOLESALE' ? 'Toptan sipariş' : null,
        ai_confidence: input.orderConfidence || 0,
        ai_transcript: null,
      })
      .select()
      .single();

    if (orderError) {
      this.logger.error(`Order creation failed: ${orderError.message}`);
      throw new Error(`Order creation failed: ${orderError.message}`);
    }

    // 5. Create order items
    await this.createOrderItems(order.id, input.tenantId, input.products);

    // 6. Update session if exists
    if (input.sessionId) {
      await this.supabase.db
        .from('conversation_sessions')
        .update({ status: 'completed', session_data: { order_id: order.id, order_number: orderNumber } })
        .eq('id', input.sessionId);
    }

    // 7. Event Bus - ORDER_CREATED
    const paymentMethod = this.mapPayment(input.payment);
    const esnafNotify = !['iban', 'paytr', 'iyzico', 'website'].includes(paymentMethod);
    this.eventBus.emit(SystemEvents.ORDER_CREATED, input.tenantId, {
      entityType: 'order',
      orderId: order.id,
      orderNumber,
      totalPrice,
      customerId,
      confidence: input.orderConfidence,
      channel: input.channel,
      paymentMethod,
      esnafNotify,
      description: `#${orderNumber} - ${totalPrice.toLocaleString('tr-TR')} TL`,
      productCount: input.products.length,
    }, order.id);

    // 8. Campaign usage
    if (input.campaignId) {
      await this.supabase.db.from('ai_events').insert({
        tenant_id: input.tenantId,
        order_id: order.id,
        event_type: 'campaign_used',
        event_data: { campaign_id: input.campaignId },
      });
    }

    // 9. Timeline events
    const sourceMap: Record<string, string> = { phone: 'PHONE', whatsapp: 'WHATSAPP', sms: 'SMS', manual: 'PANEL' };
    const channelLabel = sourceMap[input.channel] || 'PANEL';
    const customerName = input.customer?.name || 'Bilinmiyor';
    await this.timeline.logEvent({
      tenantId: input.tenantId, entityType: 'order', entityId: order.id,
      eventType: 'ORDER_CREATED',
      description: `AI, ${channelLabel === 'WHATSAPP' ? 'WhatsApp' : 'Telefon'} üzerinden ${customerName} adına #${orderNumber} numaralı siparişi oluşturdu. (${totalPrice.toLocaleString('tr-TR')} TL)`,
      metadata: { products: input.products.length, confidence: input.orderConfidence, totalPrice, customerName },
      channel: channelLabel,
      actorType: 'AI',
    });

    this.logger.log(`Order created: #${orderNumber} (${order.id})`);

    return { orderId: order.id, orderNumber, customerId, totalPrice, status: 'new' };
  }

  private async resolveCustomer(tenantId: string, customer: { name?: string; phone?: string }, phone?: string): Promise<string> {
    const customerPhone = customer?.phone || phone;

    if (customerPhone) {
      const { data: existing } = await this.supabase.db
        .from('customers')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('phone', customerPhone)
        .maybeSingle();

      if (existing && (existing as Record<string, unknown>).id) {
        return (existing as Record<string, unknown>).id as string;
      }
    }

    const insertData: Record<string, unknown> = { tenant_id: tenantId, name: customer?.name || 'Bilinmiyor' };
    if (customerPhone) insertData.phone = customerPhone;

    const { data: created, error } = await this.supabase.db
      .from('customers')
      .insert(insertData)
      .select('id')
      .single();

    if (error || !created) {
      this.logger.warn(`Customer creation issue, using fallback: ${error?.message}`);
      const { data: fallback } = await this.supabase.db
        .from('customers')
        .select('id')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return fallback?.id || '00000000-0000-0000-0000-000000000000';
    }

    return (created as Record<string, unknown>).id as string;
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const yearPrefix = new Date().getFullYear().toString().slice(-2);
    const { data: last } = await this.supabase.db
      .from('orders')
      .select('order_number')
      .eq('tenant_id', tenantId)
      .like('order_number', `${yearPrefix}-%`)
      .order('order_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    let seq = 1;
    if (last) {
      const parts = last.order_number.split('-');
      seq = parseInt(parts[1], 10) + 1;
    }
    return `${yearPrefix}-${seq.toString().padStart(5, '0')}`;
  }

  private async findProduct(tenantId: string, productName: string) {
    const normalized = productName
      .toLowerCase()
      .replace(/i/g, 'i').replace(/ı/g, 'i')
      .replace(/ş/g, 's').replace(/ç/g, 'c')
      .replace(/ö/g, 'o').replace(/ü/g, 'u')
      .replace(/ğ/g, 'g');

    const { data: allProducts } = await this.supabase.db
      .from('products')
      .select('id, product_name, price, wholesale_price, wholesale_min_qty')
      .eq('tenant_id', tenantId);

    if (!allProducts) return null;

    const match = allProducts.find((p: Record<string, unknown>) => {
      const dbName = ((p.product_name as string) || '').toLowerCase()
        .replace(/i/g, 'i').replace(/ı/g, 'i')
        .replace(/ş/g, 's').replace(/ç/g, 'c')
        .replace(/ö/g, 'o').replace(/ü/g, 'u')
        .replace(/ğ/g, 'g');
      return dbName === normalized || dbName.includes(normalized) || normalized.includes(dbName);
    });

    if (match) return match as { id: string; price: number; wholesale_price?: number };
    return null;
  }

  private async calculateTotal(tenantId: string, products: { product_name: string; quantity: number; unit: string }[], source?: string): Promise<number> {
    const isWholesale = source === 'WHOLESALE';
    let total = 0;
    for (const p of products) {
      const product = await this.findProduct(tenantId, p.product_name);
      let price = product ? Number(product.price) : 0;
      if (isWholesale && product && Number(product.wholesale_price) > 0) {
        price = Number(product.wholesale_price);
      }
      total += price * p.quantity;
    }
    return total;
  }

  private async createOrderItems(orderId: string, tenantId: string, products: { product_name: string; quantity: number; unit: string }[]) {
    const items = await Promise.all(products.map(async (p) => {
      const product = await this.findProduct(tenantId, p.product_name);
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
    }));

    const { error } = await this.supabase.db.from('order_items').insert(items);
    if (error) this.logger.error(`Order items creation failed: ${error.message}`);
  }

  private mapPayment(payment?: string): string {
    const map: Record<string, string> = {
      IBAN: 'iban', HAVALE: 'iban', EFT: 'iban', CASH: 'cod', CARD: 'website', PAYTR: 'paytr',
      UNKNOWN: 'iban', CASH_ON_DELIVERY: 'cod', cash_on_delivery: 'cod',
      'Kapıda Nakit': 'cod', 'Kapıda Ödeme': 'cod', 'Kapıda Kredi Kartı': 'kapida_kart',
    };
    return map[payment || ''] || 'iban';
  }
}
