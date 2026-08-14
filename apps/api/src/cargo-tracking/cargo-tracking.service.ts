import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../common/supabase.client';
import { TimelineService } from '../timeline/timeline.service';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';

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
 * Default mod:  arka planda çalışan sorgu botu — kargo firmasının açık takip servisine
 *               periyodik kontrol yapar (kronometre taslağı).
 * Kurumsal mod: esnaf kargo API anahtarı tanımlamışsa doğrudan resmi API'den çekilir
 *               (api-keys / tenant_settings üzerinden — entegrasyon noktası).
 *
 * Kargo durumu "Teslim Edildi" olduğunda:
 *   1. Sipariş durumu güncellenir (DELIVERED / completed)
 *   2. Sağ üst panele anlık bildirim düşer (EventBus -> notification engine)
 *   3. Timeline'a "kargosu teslim edildi, tahsilat kontrol ediniz" kaydı eklenir
 */
@Injectable()
export class CargoTrackingService implements OnModuleInit {
  private readonly logger = new Logger(CargoTrackingService.name);
  private enabled = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly timeline: TimelineService,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    // Kurumsal mod aktif mi kontrol et (esnaf kargo API anahtarı tanımladıysa)
    this.enabled = process.env.CARGO_API_ENABLED === 'true';
    if (this.enabled) {
      this.logger.log('Cargo tracking engine: kurumsal mod aktif');
    } else {
      this.logger.log('Cargo tracking engine: default mod (açık takip servisi sorgu botu) aktif');
    }
  }

  /** Default mod sorgu botu — her 30 dakikada bir çalışır */
  @Cron('0 */30 * * * *')
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
   * Kargo firmasının takip servisinden durumu sorgula.
   * Kurumsal modda resmi API çağrılır; default modda açık takip sayfası
   * taranır (prototip: yapılandırılmış firma API'leri buraya bağlanır).
   */
  async checkCargoStatus(order: Record<string, any>): Promise<string> {
    const company = String(order.cargo_company || '').toLowerCase();
    const tracking = String(order.tracking_number || '');

    if (!company || !tracking) return 'UNKNOWN';

    if (this.enabled && order.cargo_company === 'dhl') {
      // Kurumsal mod örneği: DHL API entegrasyonu buraya bağlanır
      // const apiKey = await this.getCargoApiKey(order.tenant_id);
      // return this.dhlApi.checkStatus(tracking, apiKey);
      return 'IN_TRANSIT';
    }

    // Default mod: gerçek entegrasyon olmadığında durumu "in transit" say.
    // Gerçek tarayıcı/API bağlantısı entegrasyon noktasında eklenir.
    return 'IN_TRANSIT';
  }

  /** Kargo teslim edildiyse siparişi DELIVERED yap + bildirim + timeline */
  async markDelivered(order: Record<string, any>) {
    const customerName = (order.customer as Record<string, unknown>)?.name || 'Müşteri';
    const orderNumber = order.order_number || '';

    // 1. Sipariş durumunu güncelle
    await this.supabase.db
      .from('orders')
      .update({ status: 'DELIVERED', payment_status: order.payment_method === 'iban' || order.payment_status === 'waiting' ? 'waiting' : 'paid' })
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

  /** Kurumsal modda kargo API anahtarını tenant_settings'ten okur */
  private async getCargoApiKey(tenantId: string): Promise<string> {
    const { data } = await this.supabase.db
      .from('tenant_settings')
      .select('cargo_api_key')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    return String((data as any)?.cargo_api_key || '');
  }
}
