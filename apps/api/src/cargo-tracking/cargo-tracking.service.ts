import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../common/supabase.client';
import { TimelineService } from '../timeline/timeline.service';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';
import { WhatsAppConversationsService } from '../whatsapp/conversations/conversations.service';
import { CargoFirmFactory } from './cargo.factory';
import { CargoShipmentRequest, CargoProviderNotConfiguredError } from './cargo-provider.interface';

export const CARGO_TRACKING_URLS: Record<string, string> = {
  yurtici: 'https://gonderitakip.yurticikargo.com/',
  mng: 'https://app.mngkargo.com.tr/mngkargo/staticcontent/urun-takip/',
  aras: 'https://kargotakip.araskargo.com.tr/',
  ptt: 'https://gonderitakip.ptt.gov.tr/',
  surat: 'https://www.suratkargo.com.tr/KargoTakip',
  dhl: 'https://www.dhl.com/tr-tr/home/tracking.html',
};

export function getCargoTrackingUrl(company: string, trackingNumber: string): string {
  const base = CARGO_TRACKING_URLS[String(company || '').toLowerCase()] || CARGO_TRACKING_URLS.yurtici;
  if (!trackingNumber) return base;
  if (company === 'dhl') return `${base}?tracking-id=${encodeURIComponent(trackingNumber)}`;
  return base;
}

/**
 * Hibrit Kargo Takip Motoru (Cargo Tracking Engine)
 *
 * 6 kargo firması (Yurtiçi, Aras, MNG, DHL, Sürat, PTT) için firma başına
 * entegrasyon (cargo_integrations) desteği:
 *  - Entegrasyon tanımlıysa gönderim + gerçek takip API'si kullanılır.
 *  - Tanımlı değilse dormant kalır; durum "in transit" kabul edilir.
 *
 * Arka plandaki poll görevi (30 dk) kargo durumunu tarar.
 * Kargo durumu "Teslim Edildi" olduğunda:
 *   1. Sipariş durumu güncellenir (DELIVERED / completed)
 *   2. Sağ üst panele anlık bildirim düşer (EventBus -> notification engine)
 *   3. Timeline'a "kargosu teslim edildi, tahsilat kontrol ediniz" kaydı eklenir
 */
@Injectable()
export class CargoTrackingService {
  private readonly logger = new Logger(CargoTrackingService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly timeline: TimelineService,
    private readonly eventBus: EventBusService,
    private readonly factory: CargoFirmFactory,
    private readonly whatsapp: WhatsAppConversationsService,
  ) {}

  /** Varsayılan kargo firmasını döner: ayar → ilk enabled entegrasyon → null */
  async getDefaultCargoCompany(tenantId: string): Promise<string | null> {
    const { data: settings } = await this.supabase.db
      .from('tenant_settings')
      .select('default_cargo_company')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (settings?.default_cargo_company) return settings.default_cargo_company as string;

    const { data: integrations } = await this.supabase.db
      .from('cargo_integrations')
      .select('company')
      .eq('tenant_id', tenantId)
      .eq('enabled', true)
      .limit(1);

    return integrations?.[0]?.company || null;
  }

  /** Entegrasyonlar sayfasından "Varsayılan Yap" ile kargo firmasını ayarlar. */
  async setDefaultCargoCompany(tenantId: string, company: string): Promise<void> {
    const adapter = this.factory.getAdapter(company);
    if (!adapter) throw new Error('Firma tanınmıyor');

    await this.supabase.db
      .from('tenant_settings')
      .upsert({ tenant_id: tenantId, default_cargo_company: adapter.company }, { onConflict: 'tenant_id' });
  }

  /** Default mod sorgu botu — her 15 dakikada bir çalışır */
  @Cron('0 */15 * * * *')
  async pollShippedOrders() {
    try {
      const cutoff = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await this.supabase.db
        .from('orders')
        .select('*, customer:customer_id(name, phone)')
        .in('status', ['shipped', 'SHIPPED', 'PACKAGING', 'PACKAGED'])
        .gte('created_at', cutoff)
        .limit(50);

      if (error) { this.logger.error(`Cargo poll query error: ${JSON.stringify(error)}`); return; }

      for (const order of (data || []) as Record<string, any>[]) {
        const result = await this.checkCargoStatus(order);
        if (result === 'DELIVERED') await this.markDelivered(order);
      }
    } catch (e) {
      this.logger.error(`Cargo poll failed: ${String(e)}`);
    }
  }

  /**
   * Kargo firmasının durumunu sorgula.
   * Firma entegrasyonu tanımlıysa (cargo_integrations) gerçek API çağrılır;
   * tanımlı değilse dormant modda 'IN_TRANSIT' kabul edilir.
   */
  async checkCargoStatus(order: Record<string, any>): Promise<string> {
    const company = String(order.cargo_company || '').toLowerCase();
    const tracking = String(order.tracking_number || '');

    if (!company || !tracking) return 'UNKNOWN';

    const adapter = this.factory.getAdapter(company);
    if (!adapter) return 'UNKNOWN';
    if (!(await adapter.isConfigured(order.tenant_id))) return 'IN_TRANSIT';

    try {
      const result = await adapter.checkStatus(order.tenant_id, tracking);
      const mapped: Record<string, string> = {
        pending: 'PENDING',
        in_transit: 'IN_TRANSIT',
        out_for_delivery: 'OUT_FOR_DELIVERY',
        delivered: 'DELIVERED',
        failed: 'FAILED',
        unknown: 'UNKNOWN',
      };
      const status = mapped[result.status] || 'UNKNOWN';

      await this.supabase.db
        .from('orders')
        .update({ cargo_status: result.status, cargo_status_updated_at: new Date().toISOString() })
        .eq('tenant_id', order.tenant_id)
        .eq('id', order.id);

      return status;
    } catch (err) {
      this.logger.error(`Kargo durumu sorgusu başarısız: ${(err as Error).message}`);
      return 'IN_TRANSIT';
    }
  }

  /**
   * "Durumu Güncelle" akışı: firmaya anlık sorgu atar ve sonucu DB'ye yazar.
   * Sipariş teslim edildiyse markDelivered tetiklenir (bildirim + timeline + durum).
   */
  async checkOrderStatus(tenantId: string, company: string, trackingNumber: string, orderId?: string): Promise<Record<string, any>> {
    const adapter = this.factory.getAdapter(company);
    if (!adapter) return { error: 'Firma tanınmıyor' };
    if (!(await adapter.isConfigured(tenantId))) {
      return { status: 'unknown', description: 'Entegrasyon tanımlı değil' };
    }

    const result = await adapter.checkStatus(tenantId, trackingNumber);

    if (orderId) {
      const { data: order } = await this.supabase.db
        .from('orders')
        .select('*, customer:customer_id(name, phone)')
        .eq('tenant_id', tenantId)
        .eq('id', orderId)
        .maybeSingle();

      if (order) {
        await this.supabase.db
          .from('orders')
          .update({ cargo_status: result.status, cargo_status_updated_at: new Date().toISOString() })
          .eq('tenant_id', tenantId)
          .eq('id', orderId);

        if (String(result.status || '').toLowerCase() === 'delivered') {
          await this.markDelivered(order);
        }
      }
    }

    return result;
  }

  /**
   * Siparişi kargo firması üzerinden gönderime verir.
   * Firma sırası: istek parametresi → siparişte kayıtlı firma → varsayılan firma.
   * Başarıda takip kodu API'den gelir (elle girilmez), müşteri bilgilendirilir.
   */
  async createShipment(tenantId: string, orderId: string, company?: string): Promise<{ success: boolean; message?: string; trackingNumber?: string }> {
    const { data: order, error } = await this.supabase.db
      .from('orders')
      .select('*, customer:customer_id(name, phone, address, city), items:order_items(product_name, quantity, unit, unit_price)')
      .eq('tenant_id', tenantId)
      .eq('id', orderId)
      .single();

    if (error || !order) return { success: false, message: 'Sipariş bulunamadı' };

    const o = order as any;
    const defaultCompany = company || o.cargo_company || (await this.getDefaultCargoCompany(tenantId));
    const adapter = this.factory.getAdapter(String(defaultCompany || ''));
    if (!adapter) {
      return { success: false, message: 'Kargo firması tanımlı değil. Entegrasyonlar sayfasından bir firmayı "Varsayılan Yap" ile işaretleyin.' };
    }
    if (!(await adapter.isConfigured(tenantId))) {
      return { success: false, message: `${adapter.label} entegrasyonu tanımlı değil. API anahtarlarını Entegrasyonlar sayfasından ekleyin.` };
    }

    const customer = o.customer || {};
    const items = (o.items || []).map((i: any) => ({ productName: i.product_name, quantity: Number(i.quantity), unit: i.unit, price: Number(i.unit_price) }));

    const req: CargoShipmentRequest = {
      tenantId,
      orderId: o.id,
      orderNumber: o.order_number,
      customerName: customer.name || 'Müşteri',
      customerPhone: customer.phone || '',
      customerAddress: customer.address || '',
      customerCity: customer.city || '',
      items,
      totalPrice: Number(o.total_price || 0),
      codAmount: o.payment_method === 'cod' ? Number(o.total_price || 0) : 0,
    };

    try {
      const result = await adapter.createShipment(tenantId, req);
      const pm = String(o.payment_method || '').toLowerCase();
      const isCod = pm === 'cod' || pm === 'cash_on_delivery';
      await this.supabase.db
        .from('orders')
        .update({
          cargo_company: adapter.company,
          tracking_number: result.trackingNumber,
          cargo_status: 'pending',
          cargo_status_updated_at: new Date().toISOString(),
          status: 'SHIPPED',
          payment_status: isCod ? (o.payment_status || 'waiting') : 'paid',
        })
        .eq('tenant_id', tenantId)
        .eq('id', orderId);

      // Manuel onay yolu: dekont otomatik tespit edilememişse, esnaf "Kargoya Ver" ile
      // onayladığında esnaf bildirim zinciri (panel + grup + yazıcı) burada tetiklenir.
      const isIban = pm === 'iban';
      const alreadyNotified = ['dekont_alindi', 'paid'].includes(String(o.payment_status || ''));
      if (isIban && !alreadyNotified) {
        this.eventBus.emit(SystemEvents.ORDER_PAYMENT_CONFIRMED, tenantId, {
          entityType: 'order',
          orderId,
          orderNumber: o.order_number,
          customerName: customer.name || '',
          customerPhone: customer.phone || '',
          totalPrice: o.total_price,
          paymentMethod: 'iban',
          paymentNote: 'Dekont esnafça görüldü — onaylandı',
          dekont: true,
          description: `🆕 Yeni Sipariş #${o.order_number}\n💵 Havale — dekont esnafça onaylandı`,
        }, orderId);
      }

      await this.timeline.logEvent({
        tenantId,
        entityType: 'order',
        entityId: orderId,
        eventType: 'STATUS_SHIPPED',
        description: `Kargo gönderildi: ${adapter.label} - ${result.trackingNumber}`,
        actorType: 'AI',
        channel: 'SYSTEM',
      });

      // Müşteriye kargo bildirimi (firma + takip no + takip linki)
      await this.notifyCustomer(tenantId, o, adapter.company, result.trackingNumber);

      // Kargo gönderildi olayı (NotificationService → grup + yazıcı)
      this.eventBus.emit(SystemEvents.ORDER_SHIPPED, tenantId, {
        entityType: 'order',
        orderId,
        cargoCompany: adapter.company,
        trackingNumber: result.trackingNumber,
        description: `Sipariş #${o.order_number} kargoya verildi - ${adapter.label} (${result.trackingNumber})`,
      }, orderId);

      return { success: true, trackingNumber: result.trackingNumber };
    } catch (err) {
      const msg = err instanceof CargoProviderNotConfiguredError ? 'Kargo entegrasyonu tanımlı değil' : (err as Error).message;
      return { success: false, message: msg };
    }
  }

  /** Müşteriye takip bilgisi bildirimi (WhatsApp kuyruğa yazılır). */
  private async notifyCustomer(tenantId: string, order: Record<string, any>, company: string, trackingNumber: string): Promise<void> {
    try {
      const customerId = order.customer_id;
      if (!customerId) return;
      const { data: customer } = await this.supabase.db
        .from('customers')
        .select('name, phone')
        .eq('id', customerId)
        .maybeSingle();
      if (!customer?.phone) return;

      const trackingUrl = getCargoTrackingUrl(company, trackingNumber);
      const message = `Merhaba ${customer.name || 'Değerli Müşterimiz'}, #${order.order_number} nolu siparişiniz kargoya verilmiştir.\nKargo Firması: ${company}\nTakip No: ${trackingNumber}${trackingUrl ? `\nTakip: ${trackingUrl}` : ''}\n\nSiparişAsistanı`;

      const convId = await this.whatsapp.findOrCreate(tenantId, customer.phone);
      await this.whatsapp.addMessage({ tenantId, conversationId: convId, direction: 'outgoing', body: message });
    } catch (err) {
      this.logger.warn(`Müşteri kargo bildirimi gönderilemedi: ${(err as Error).message}`);
    }
  }

  /** Entegrasyon listesi (tüm firmalar, yapılandırma durumuyla). */
  async getIntegrations(tenantId: string): Promise<Record<string, unknown>[]> {
    const { data } = await this.supabase.db
      .from('cargo_integrations')
      .select('*')
      .eq('tenant_id', tenantId);

    const defaultCompany = await this.getDefaultCargoCompany(tenantId);
    const map = new Map<string, Record<string, unknown>>();
    for (const row of data || []) {
      map.set(String((row as any).company), row);
    }

    const result: Record<string, unknown>[] = [];
    for (const adapter of this.factory.listAdapters()) {
      const existing = map.get(adapter.company);
      const configured = !!(existing as any)?.api_key;
      result.push({
        company: adapter.company,
        label: adapter.label,
        enabled: !!(existing as any)?.enabled,
        configured,
        is_default: defaultCompany === adapter.company,
        api_key: (existing as any)?.api_key || '',
        api_secret: (existing as any)?.api_secret || '',
        extra_config: (existing as any)?.extra_config || {},
        support_url: this.getSupportUrl(adapter.company),
      });
    }
    return result;
  }

  /** Entegrasyonu kaydeder (upsert). */
  async saveIntegration(tenantId: string, company: string, body: { enabled?: boolean; api_key?: string; api_secret?: string; extra_config?: Record<string, unknown> }): Promise<void> {
    await this.supabase.db.from('cargo_integrations').upsert({
      tenant_id: tenantId,
      company,
      enabled: body.enabled ?? false,
      api_key: body.api_key || null,
      api_secret: body.api_secret || null,
      extra_config: body.extra_config || {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,company' });
  }

  /** Entegrasyon testi: kimlik tanımlıysa gerçek sorgu yapılır. */
  async testIntegration(tenantId: string, company: string): Promise<{ success: boolean; message: string }> {
    const adapter = this.factory.getAdapter(company);
    if (!adapter) return { success: false, message: 'Firma tanınmıyor' };
    if (!(await adapter.isConfigured(tenantId))) {
      return { success: false, message: 'API anahtarı tanımlı değil' };
    }
    return { success: true, message: `${adapter.label} bağlantısı hazır (API çağrısı gönderim anında yapılır)` };
  }

  private getSupportUrl(company: string): string {
    return CARGO_TRACKING_URLS[company] || CARGO_TRACKING_URLS.yurtici;
  }

  /** Controller/UI için firma adapter erişimi. */
  getAdapter(company: string) {
    return this.factory.getAdapter(company);
  }

  /** Kargo teslim edildiyse siparişi DELIVERED yap + bildirim + timeline */
  async markDelivered(order: Record<string, any>) {
    const customerName = (order.customer as Record<string, unknown>)?.name || 'Müşteri';
    const orderNumber = order.order_number || '';

    // 1. Sipariş durumunu güncelle — kapıda ödeme teslimatta tahsil edilir, diğerleri aynı kalır
    await this.supabase.db
      .from('orders')
      .update({ status: 'DELIVERED', payment_status: order.payment_method === 'cod' ? 'paid' : (order.payment_status || 'waiting') })
      .eq('tenant_id', order.tenant_id)
      .eq('id', order.id);

    // 2. Sağ üst panele anlık bildirim (EventBus -> notification engine)
    this.eventBus.emit(SystemEvents.ORDER_UPDATED, order.tenant_id, {
      entityType: 'order',
      orderId: order.id,
      orderNumber,
      eventType: 'CARGO_DELIVERED',
      description: `#${orderNumber} - ${customerName} kargosu teslim edildi. Kapıda ödeme / tahsilat kontrol ediniz.`,
      customerName,
      channel: order.channel,
    });

    // 3. Timeline kaydı
    await this.timeline.logEvent({
      tenantId: order.tenant_id,
      entityType: 'order',
      entityId: order.id,
      eventType: 'CARGO_DELIVERED',
      description: `#${orderNumber} - ${customerName} kargosu teslim edildi. Kapıda ödeme / tahsilat kontrol ediniz.`,
      actorType: 'AI',
      channel: 'SYSTEM',
    });

    this.logger.log(`Cargo delivered: ${orderNumber} (${customerName})`);
  }
}
