import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { AiOrderInput, OrderResult } from '@siparis/types';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';
import { WhatsAppConversationsService } from '../whatsapp/conversations/conversations.service';
import { OutboundService } from '../messages/outbound.service';

const PREPAID_METHODS = ['iban', 'paytr', 'iyzico', 'website'];

function isPrepaid(paymentMethod?: string): boolean {
  return PREPAID_METHODS.includes(String(paymentMethod || '').toLowerCase());
}

@Injectable()
export class OrderEngineService {
  private readonly logger = new Logger(OrderEngineService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventBus: EventBusService,
    private readonly whatsapp: WhatsAppConversationsService,
    private readonly outbound: OutboundService,
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
      // Fatura bilgisi verilmişse mevcut müşteriyi güncelle (P63)
      const patch: Record<string, unknown> = {};
      if (input.customer.name) patch.name = input.customer.name;
      if (input.customer.company_name) patch.company_name = input.customer.company_name;
      if (input.customer.identity_number) patch.identity_number = input.customer.identity_number;
      if (Object.keys(patch).length) {
        await this.supabase.db.from('customers').update(patch).eq('id', existing.id);
      }
      return existing;
    }

    const { data: created, error } = await this.supabase.db
      .from('customers')
      .insert({
        tenant_id: tenantId,
        name: input.customer.name,
        phone: input.customer.phone,
        address: [input.customer.address, input.customer.district].filter(Boolean).join(', ') || null,
        city: input.customer.city || null,
        company_name: input.customer.company_name || null,
        identity_number: input.customer.identity_number || null,
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
        payment_method: this.normalizePayment(input.payment),
        payment_status: this.normalizePayment(input.payment) === 'iban' ? 'awaiting_dekont' : 'waiting',
        total_price: totalPrice,
        customer_note: input.notes || null,
        customer_name: input.customer.name || null,
        customer_phone: input.customer.phone || null,
        customer_address: [input.customer.address, input.customer.district].filter(Boolean).join(', ') || null,
        customer_city: input.customer.city || null,
        customer_district: input.customer.district || null,
      })
      .select()
      .single();

    if (orderError) {
      this.logger.error(`Order creation failed: ${orderError.message}`);
      throw new Error(`Order creation failed: ${orderError.message}`);
    }

    await this.createOrderItems(order.id, input.products, tenantId);

    const paymentMethod = this.normalizePayment(input.payment);
    const esnafNotify = !isPrepaid(paymentMethod);

    // NOT: "Yeni Sipariş" bildirimi tek kaynaktan (notification-engine/order-created.handler) düşer.
    // Burada ikinci kez insert ETME → aynı sipariş için çift bildirim oluşuyordu.
    await this.logAiEvent(tenantId, order.id, 'order_received', {
      confidence: input.confidence,
      channel: input.channel,
      products: input.products.length,
      payment_method: paymentMethod,
      esnaf_notified: esnafNotify,
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
      customerName: input.customer?.name || '',
      city: input.customer?.city || '',
      district: input.customer?.district || '',
      items: (input.products || []).map((p) => ({
        name: (p as { productName?: string; name?: string }).productName || (p as { name?: string }).name || '',
        quantity: (p as { quantity?: number }).quantity || 0,
        unit: (p as { unit?: string }).unit || '',
      })),
      confidence: input.confidence,
      channel: input.channel,
      paymentMethod,
      esnafNotify,
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

  /**
   * Onaylanmış bir siparişi günceller (ürün/miktar/ödeme/not değişikliği).
   * Kalemleri yeniden yazar, toplamı yeniden hesaplar ve ORDER_UPDATED yayar.
   */
  async updateOrder(orderId: string, input: AiOrderInput, tenantId: string): Promise<OrderResult> {
    // Kargoya verilmiş/teslim edilmiş/iptal sipariş güncellenemez.
    const { data: currentOrder } = await this.supabase.db
      .from('orders')
      .select('status, cargo_status')
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!currentOrder) throw new Error('ORDER_NOT_FOUND');
    const currentStatus = String((currentOrder as Record<string, unknown>).status || '').toLowerCase();
    const currentCargo = String((currentOrder as Record<string, unknown>).cargo_status || '').toLowerCase();
    if (
      ['shipped', 'delivered', 'completed', 'cancelled'].includes(currentStatus) ||
      ['in_transit', 'at_branch', 'out_for_delivery', 'delivered'].includes(currentCargo)
    ) {
      throw new Error('ORDER_NOT_UPDATABLE');
    }

    const totalPrice = await this.calculateTotal(input, tenantId);

    // Düzenleme notu (FAZ 4): mevcut müşteri notunu koru + yeni not + zaman damgası
    const editNote = `Müşteri ${new Date().toLocaleString('tr-TR')} tarihinde siparişi düzenledi`;
    let prevNote = '';
    try {
      const { data: prev } = await this.supabase.db.from('orders').select('customer_note').eq('id', orderId).maybeSingle();
      prevNote = String((prev as Record<string, unknown> | null)?.customer_note || '').trim();
    } catch { /* yoksay */ }
    const notesToAdd = input.notes && !prevNote.includes(String(input.notes)) ? String(input.notes) : '';
    const customerNote = [prevNote, notesToAdd, editNote].filter(Boolean).join(' | ');

    const { data: order, error } = await this.supabase.db
      .from('orders')
      .update({
        total_price: totalPrice,
        payment_method: this.normalizePayment(input.payment),
        customer_note: customerNote,
      })
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Order update failed: ${error.message}`);
      throw new Error(`Order update failed: ${error.message}`);
    }

    await this.supabase.db.from('order_items').delete().eq('order_id', orderId);
    await this.createOrderItems(orderId, input.products, tenantId);

    const o = order as Record<string, unknown>;
    const orderNumber = String(o.order_number);
    const paymentMethod = this.normalizePayment(input.payment);

    await this.logAiEvent(tenantId, orderId, 'order_updated', {
      channel: input.channel,
      products: input.products.length,
      payment_method: paymentMethod,
      total_price: totalPrice,
    });

    this.eventBus.emit(SystemEvents.ORDER_UPDATED, tenantId, {
      entityType: 'order',
      orderId,
      orderNumber,
      totalPrice,
      paymentMethod,
      productCount: input.products.length,
      description: `#${orderNumber} güncellendi - ${totalPrice.toLocaleString('tr-TR')} TL`,
    }, orderId);

    return {
      order_id: orderId,
      order_number: orderNumber,
      tenant_id: tenantId,
      customer_id: String(o.customer_id),
      total_price: totalPrice,
      status: (o.status ? String(o.status) : 'new') as OrderResult['status'],
      confidence: input.confidence,
    };
  }

  /** Aktif kampanyalardan, miktar koşulu sağlanan hediye ürünlerini döndürür (0 TL kalem). */
  private async resolveCampaignGifts(
    products: AiOrderInput['products'],
    tenantId: string,
  ): Promise<Array<{ product: string; qty: number; unit: string }>> {
    try {
      const { data } = await this.supabase.db
        .from('campaigns')
        .select('gift_product, gift_quantity, gift_unit, target_product, min_quantity, active')
        .eq('tenant_id', tenantId)
        .eq('active', true);
      const gifts: Array<{ product: string; qty: number; unit: string }> = [];
      const seen = new Set<string>();
      for (const c of (data || []) as Array<Record<string, unknown>>) {
        const gift = String(c.gift_product || '').trim();
        if (!gift) continue;
        const minQ = Number(c.min_quantity) || 0;
        // Eşik girilmemişse (0/boş) hediye verme — yanlış hediye eklenmesin.
        if (minQ <= 0) continue;
        const target = String(c.target_product || '').trim().toLowerCase();
        const matchedQty = products
          .filter((p) => !target || String(p.product_name).toLowerCase().includes(target))
          .reduce((s, p) => s + Number(p.quantity || 0), 0);
        if (matchedQty < minQ) continue;
        const key = gift.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        gifts.push({ product: gift, qty: Number(c.gift_quantity) || 1, unit: String(c.gift_unit || 'KG') });
      }
      return gifts;
    } catch {
      return [];
    }
  }

  private async createOrderItems(
    orderId: string,
    products: AiOrderInput['products'],
    tenantId: string,
  ) {
    const items: Array<Record<string, unknown>> = await Promise.all(
      products.map(async (p) => {
        const { data: product } = await this.supabase.db
          .from('products')
          .select('id, price, wholesale_price, wholesale_min_qty')
          .eq('tenant_id', tenantId)
          .eq('product_name', p.product_name)
          .maybeSingle();

        const unitPrice = this.resolveUnitPrice(product, p.quantity);
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

    // Kampanya hediyeleri → 0 TL kalem olarak eklenir (esnaf paketin içine koysun diye görünür).
    try {
      const gifts = await this.resolveCampaignGifts(products, tenantId);
      for (const g of gifts) {
        items.push({
          order_id: orderId,
          product_id: null,
          product_name: g.product,
          quantity: g.qty,
          unit: g.unit,
          unit_price: 0,
          total: 0,
        });
      }
    } catch { /* yoksay */ }

    const { error } = await this.supabase.db
      .from('order_items')
      .insert(items);

    if (error) {
      this.logger.error(`Order items creation failed: ${error.message}`);
    }
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const yearPrefix = new Date().getFullYear().toString().slice(-2);

    // FAZ 5: atomik sayaç (race-free) — aynı anda gelen siparişler aynı numarayı almaz.
    // Sayaç tablosu/fonksiyonu yoksa (migration uygulanmadıysa) eski mantığa düşer.
    try {
      const { data, error } = await this.supabase.db.rpc('next_order_seq', {
        p_tenant: tenantId,
        p_year_prefix: yearPrefix,
      });
      if (!error && data != null) {
        return `${yearPrefix}-${Number(data).toString().padStart(5, '0')}`;
      }
    } catch { /* fallback */ }

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

  /** Birim fiyat: miktar toptan eşiğine ulaşıyorsa wholesale_price, aksi halde price. */
  private resolveUnitPrice(
    product: { price?: number | string | null; wholesale_price?: number | string | null; wholesale_min_qty?: number | string | null } | null,
    qty: number,
  ): number {
    if (!product) return 0;
    const base = Number(product.price) || 0;
    const wholesale = Number(product.wholesale_price) || 0;
    const minQty = Number(product.wholesale_min_qty) || 0;
    if (wholesale > 0 && minQty > 0 && qty >= minQty) return wholesale;
    return base;
  }

  async calculateTotal(
    input: AiOrderInput,
    tenantId: string,
  ): Promise<number> {
    let total = 0;

    for (const p of input.products) {
      const { data: product } = await this.supabase.db
        .from('products')
        .select('price, wholesale_price, wholesale_min_qty')
        .eq('tenant_id', tenantId)
        .eq('product_name', p.product_name)
        .maybeSingle();

      const price = this.resolveUnitPrice(product, p.quantity);
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
    // Kullanılmıyor: sipariş bildirimi order-created.handler'dan geçer (çift bildirimi önlemek için kapatıldı).
    void tenantId; void orderId; void orderNumber; void totalPrice;
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

  private normalizePayment(payment?: string): string {
    const map: Record<string, string> = {
      IBAN: 'iban', iban: 'iban', 'IBAN (Havale/EFT)': 'iban', HAVALE: 'iban', EFT: 'iban',
      CASH_ON_DELIVERY: 'cod', cash_on_delivery: 'cod', COD: 'cod', cod: 'cod',
      kapida_kart: 'kapida_kart', KAPIDA_KART: 'kapida_kart',
      'KAPIDA NAKİT': 'cod', 'Kapıda Nakit': 'cod', KAPIDA_NAKIT: 'cod', 'KAPIDA ODEME': 'cod', 'Kapıda Ödeme': 'cod',
      'KAPIDA KREDI KARTI': 'kapida_kart', 'Kapıda Kredi Kartı': 'kapida_kart', 'Kapıda Kart': 'kapida_kart',
      CASH: 'cod', CARD: 'website', WEBSITE: 'website', website: 'website',
      PAYTR: 'paytr', paytr: 'paytr', PAYMENT_LINK: 'paytr', LINK: 'paytr',
      IYZICO: 'iyzico', iyzico: 'iyzico',
    };
    return map[String(payment || '').trim()] || 'iban';
  }

  /**
   * IBAN siparişinde dekont alındığını işaretler ve esnaf bildirim zincirini tetikler.
   * source: 'auto' (müşteri beyanı/gelen mesaj) | 'esnaf' (manuel onay)
   */
  async markDekontReceived(orderId: string, source: 'auto' | 'esnaf' = 'auto'): Promise<boolean> {
    const { data: order } = await this.supabase.db
      .from('orders')
      .select('*, customer:customer_id(name, phone)')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) return false;

    const o = order as Record<string, unknown>;
    if (this.normalizePayment(String(o.payment_method || '')) !== 'iban') return false;
    if (['paid', 'dekont_alindi'].includes(String(o.payment_status || ''))) return false;

    const paymentNote = source === 'auto'
      ? 'Müşteri dekont gönderdi — onay bekliyor'
      : 'Dekont esnafça görüldü — onaylandı';

    await this.supabase.db
      .from('orders')
      .update({ payment_status: 'dekont_alindi', payment_note: paymentNote })
      .eq('id', orderId);

    this.eventBus.emit(SystemEvents.ORDER_PAYMENT_CONFIRMED, String(o.tenant_id), {
      entityType: 'order',
      orderId,
      orderNumber: o.order_number,
      customerName: (o.customer as Record<string, unknown>)?.name || '',
      customerPhone: (o.customer as Record<string, unknown>)?.phone || '',
      totalPrice: o.total_price,
      paymentMethod: 'iban',
      paymentNote,
      dekont: true,
      description: `🆕 Yeni Sipariş #${o.order_number}\n💵 Havale — ${paymentNote}`,
    }, orderId);

    this.logger.log(`Dekont received (${source}) for order ${o.order_number}`);
    return true;
  }

  /** Ödeme bekleyen (dekont beklenen) IBAN siparişini telefon numarasına göre bulur. */
  async findAwaitingDekontOrder(
    tenantId: string,
    phone: string,
  ): Promise<{ id: string; order_number?: string; customer_name?: string } | null> {
    const variants = this.phoneVariants(phone);
    if (!variants.length) return null;

    const { data: order } = await this.supabase.db
      .from('orders')
      .select('id, order_number, customer_name')
      .eq('tenant_id', tenantId)
      .eq('payment_method', 'iban')
      .in('payment_status', ['awaiting_dekont', 'waiting'])
      .neq('status', 'cancelled')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
      .in('customer_phone', variants)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return order
      ? {
          id: String(order.id),
          order_number: (order as Record<string, unknown>).order_number as string | undefined,
          customer_name: (order as Record<string, unknown>).customer_name as string | undefined,
        }
      : null;
  }

  /** Telefonun son 7 gündeki en son siparişi (yeni sipariş / mevcut siparişe ekleme ayrımı için). */
  async findRecentOrderByPhone(
    tenantId: string,
    phone: string,
  ): Promise<{
    id: string;
    order_number?: string;
    status?: string;
    cargo_status?: string;
    cargo_company?: string;
    tracking_number?: string;
    total_price?: number;
    payment_method?: string;
    payment_status?: string;
    created_at?: string;
    customer_name?: string;
  } | null> {
    const variants = this.phoneVariants(phone);
    if (!variants.length) return null;

    const { data } = await this.supabase.db
      .from('orders')
      .select(
        'id, order_number, status, cargo_status, cargo_company, tracking_number, total_price, payment_method, payment_status, created_at, customer_name',
      )
      .eq('tenant_id', tenantId)
      .in('customer_phone', variants)
      .neq('status', 'cancelled')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    const o = data as Record<string, unknown>;
    return {
      id: String(o.id),
      order_number: o.order_number ? String(o.order_number) : undefined,
      status: o.status ? String(o.status) : undefined,
      cargo_status: o.cargo_status ? String(o.cargo_status) : undefined,
      cargo_company: o.cargo_company ? String(o.cargo_company) : undefined,
      tracking_number: o.tracking_number ? String(o.tracking_number) : undefined,
      total_price: Number(o.total_price || 0) || undefined,
      payment_method: o.payment_method ? String(o.payment_method) : undefined,
      payment_status: o.payment_status ? String(o.payment_status) : undefined,
      created_at: o.created_at ? String(o.created_at) : undefined,
      customer_name: o.customer_name ? String(o.customer_name) : undefined,
    };
  }

  /** Telefon varyantları: 905…, 0 5…, 5… (kanallar arası eşleşme için). */
  private phoneVariants(phone: string): string[] {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return [];
    const set = new Set<string>([digits]);
    if (digits.startsWith('90') && digits.length > 10) {
      set.add('0' + digits.slice(2));
      set.add(digits.slice(2));
    } else if (digits.startsWith('0') && digits.length >= 11) {
      set.add('9' + digits);
      set.add(digits.slice(1));
    } else if (digits.length === 10) {
      set.add('90' + digits);
      set.add('0' + digits);
    }
    return Array.from(set);
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
      orderNumber: order.order_number,
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
        // WhatsApp dene; başarısızsa SMS (FAZ 4).
        let sent = false;
        try {
          const res = await this.outbound.send({ tenantId, channel: 'whatsapp', to: customerPhone, body: message, orderId });
          sent = res.success;
        } catch { /* yoksay */ }
        if (!sent) {
          try { await this.outbound.send({ tenantId, channel: 'sms', to: customerPhone, body: message, orderId }); } catch { /* yoksay */ }
        }
        // Panel konuşma kaydı (best effort)
        try {
          const convId = await this.whatsapp.findOrCreate(tenantId, customerPhone);
          await this.whatsapp.addMessage({ tenantId, conversationId: convId, direction: 'outgoing', body: message });
        } catch { /* yoksay */ }
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
