import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import { SupabaseService } from '../common/supabase.client';
import { OrderEngineService } from '../order-engine/order-engine.service';
import { OrderValidatorService } from '../ai/conversation/validator/validator';
import { OutboundService } from '../messages/outbound.service';
import { ComplaintProcessorService } from '../complaint-processor/complaint-processor.service';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';
import { AiOrderInput, PaymentMethod } from '@siparis/types';

/**
 * F0: Sipariş AI — adım adım araçlar (granular tools) + sunucu-taraflı taslak (draft).
 * İZOLE: mevcut AiBrainService / realtime.gateway / ai-employee'e DOKUNMAZ.
 * Doğrulama ve sipariş oluşturma mevcut OrderValidator + OrderEngine ile yapılır.
 *
 * Araçlar: set_customer, add_item, set_address, set_payment, set_invoice, confirm_order, update_order, set_birthday, send_payment_info, escalate, sleep.
 */

export type OrderAiTool =
  | 'set_customer' | 'add_item' | 'set_address' | 'set_payment' | 'set_invoice'
  | 'confirm_order' | 'update_order' | 'set_birthday' | 'send_payment_info' | 'escalate' | 'sleep'
  | 'get_order_status' | 'send_tracking' | 'get_customer_address' | 'update_customer'
  | 'cancel_order' | 'report_issue' | 'set_note';

interface Draft {
  customer: { name?: string; phone?: string; address?: string; city?: string; district?: string };
  products: { product_name: string; quantity: number; unit: string }[];
  payment?: PaymentMethod;
  invoice?: { company_name?: string; tax_number?: string };
  notes?: string;
  birthday?: string;
  confirmed?: boolean;
  order?: { orderNumber: string; orderId: string; total: number; status: string };
  createdAt: number;
}

const UNIT_MAP: Record<string, string> = {
  kg: 'KG', kilogram: 'KG', kilo: 'KG', kilograms: 'KG',
  adet: 'ADET', tane: 'ADET', piece: 'ADET',
  koli: 'KOLI', kasa: 'KOLI',
  tepsi: 'TEPSI',
  sap: 'SAP', sapı: 'SAP', sapi: 'SAP', bağ: 'SAP', bag: 'SAP', demet: 'SAP',
};
const normUnit = (v: unknown): string => {
  const k = String(v ?? '').trim().toLowerCase();
  return UNIT_MAP[k] || (k ? k.toUpperCase() : 'KG');
};
/** Ürün adı normalizasyonu (upsert anahtarı için): trim + TR-duyarlı küçük harf + boşluk sadeleştirme. */
const normName = (v: unknown): string =>
  String(v ?? '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');

const normPayment = (v: unknown): PaymentMethod | undefined => {
  const k = String(v ?? '').trim().toLowerCase();
  if (!k) return undefined;
  const hasKapida = /(kap.?da)/i.test(k);
  const hasKart = /(kart|kredi|credit)/.test(k);
  const hasNakit = /(nakit|pe[sş]in|cash)/.test(k);
  if (hasKapida && hasKart) return 'kapida_kart';
  if (hasKapida || hasNakit || /cod/.test(k)) return 'cash_on_delivery';
  if (/(iban|havale|eft|transfer)/.test(k)) return 'iban';
  if (/(iyzico)/.test(k)) return 'iyzico';
  if (/(paytr)/.test(k) || hasKart) return 'paytr';
  if (/(website|web|site|online)/.test(k)) return 'website';
  if (['iban', 'website', 'paytr', 'iyzico', 'cash_on_delivery', 'kapida_kart'].includes(k)) return k as PaymentMethod;
  return undefined;
};

/** Adres metninde eksik görünen bileşenleri döndürür (basit anahtar kelime sezgisi). */
function missingAddressParts(address: string, city?: string, district?: string): string[] {
  const a = String(address || '').toLocaleLowerCase('tr-TR');
  const missing: string[] = [];
  if (!/mahalle|mah\./.test(a)) missing.push('mahalle');
  if (!/sokak|cadde|bulvar|sok\.|cad\./.test(a)) missing.push('sokak/cadde');
  if (!/apartman|apartmanı|iş ?yeri|is ?yeri|blok|site|han|plaza|apt/.test(a)) missing.push('apartman/işyeri');
  // Kapı no / kat / daire bilinmiyorsa sipariş ENGELLENMEZ: AI not ekler + esnaf uyarılır.
  if (!city || !String(city).trim()) missing.push('il');
  if (!district || !String(district).trim()) missing.push('ilçe');
  return missing;
}

const TR_MONTHS: Record<string, number> = {
  ocak: 1, şubat: 2, subat: 2, mart: 3, nisan: 4, mayıs: 5, mayis: 5, haziran: 6,
  temmuz: 7, ağustos: 8, agustos: 8, eylül: 9, eylul: 9, ekim: 10, kasım: 11, kasim: 11, aralık: 12, aralik: 12,
};

function toIsoDate(day: number, month: number, year: number): string | null {
  if (!(day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100)) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Doğum günü argümanını ISO (YYYY-MM-DD) tarihe çevirir (sayısal alanlar veya serbest metin). */
function parseBirthdayArg(args: Record<string, unknown>): string | null {
  const nd = Number(args.day), nm = Number(args.month), ny = Number(args.year);
  if (Number.isFinite(nd) && Number.isFinite(nm) && Number.isFinite(ny) && nd && nm && ny) {
    return toIsoDate(nd, nm, ny);
  }
  const raw = String(args.birthday || args.date || args.value || '').trim().toLocaleLowerCase('tr-TR');
  if (!raw) return null;
  let m = raw.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (m) return toIsoDate(Number(m[3]), Number(m[2]), Number(m[1]));
  m = raw.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
  if (m) return toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = raw.match(/^(\d{1,2})\s+([a-zçğıöşü]+)\s+(\d{4})$/);
  if (m) { const mo = TR_MONTHS[m[2]]; if (mo) return toIsoDate(Number(m[1]), mo, Number(m[3])); }
  return null;
}

@Injectable()
export class OrderAiToolsService {
  private readonly logger = new Logger(OrderAiToolsService.name);
  private readonly drafts = new Map<string, Draft>();
  private readonly tenantPhoneCache = new Map<string, string>();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly orderEngine: OrderEngineService,
    private readonly validator: OrderValidatorService,
    private readonly outbound: OutboundService,
    private readonly complaintProcessor: ComplaintProcessorService,
    private readonly eventBus: EventBusService,
  ) {}

  private key(tenantId: string, sessionId: string) { return `${tenantId}:${sessionId}`; }

  /** Tenant'ın kendi telefonu (normalize) — model yanlışlıkla bunu müşteriye yazmasın diye. */
  private async getTenantPhone(tenantId: string): Promise<string> {
    if (this.tenantPhoneCache.has(tenantId)) return this.tenantPhoneCache.get(tenantId)!;
    let phone = '';
    try {
      const { data } = await this.supabase.db.from('tenants').select('phone').eq('id', tenantId).maybeSingle();
      phone = String((data as { phone?: string } | null)?.phone || '').replace(/[^\d]/g, '').replace(/^0/, '');
    } catch { /* yoksay */ }
    this.tenantPhoneCache.set(tenantId, phone);
    return phone;
  }

  private getDraft(tenantId: string, sessionId: string): Draft {
    const k = this.key(tenantId, sessionId);
    let d = this.drafts.get(k);
    if (!d) { d = { customer: {}, products: [], createdAt: Date.now() }; this.drafts.set(k, d); }
    return d;
  }

  reset(tenantId: string, sessionId: string) { this.drafts.delete(this.key(tenantId, sessionId)); }

  /** Toparlanma (watchdog) için güncel sipariş taslağı özeti (salt-okunur). */
  getDraftSummary(tenantId: string, sessionId: string): Record<string, unknown> {
    const d = this.getDraft(tenantId, sessionId);
    return {
      customer: d.customer,
      products: d.products,
      payment: d.payment || null,
      invoice: d.invoice || null,
      confirmed: !!d.confirmed,
      order: d.order || null,
    };
  }

  /** Bir aracı çalıştırır. Dönüş: { ok, result?, error? }. */
  async runTool(
    tenantId: string, sessionId: string, tool: OrderAiTool | string, args: Record<string, unknown> = {},
  ): Promise<{ ok: boolean; result?: Record<string, unknown>; error?: string }> {
    if (!tenantId) return { ok: false, error: 'tenantId gerekli' };
    const sid = sessionId || 'default';
    const d = this.getDraft(tenantId, sid);

    try {
      switch (tool) {
        case 'set_customer': {
          const name = String(args.name || args.customer_name || '').trim();
          let phone = String(args.phone || args.customer_phone || '').replace(/[^\d]/g, '').replace(/^0/, '');
          if (name) d.customer.name = name;
          // Model, prompt'taki FİRMA telefonunu müşteriye yazabiliyor → firma numarasını yok say.
          if (phone) {
            const tenantPhone = await this.getTenantPhone(tenantId);
            if (tenantPhone && phone === tenantPhone) phone = '';
          }
          // Arayan numara oturum başında tohumlanmışsa ÜZERİNE YAZMA (arayan numara korunur).
          if (phone && !d.customer.phone) d.customer.phone = phone;
          return { ok: true, result: { customer: d.customer } };
        }
        case 'add_item': {
          const product_name = String(args.product_name || args.product || args.name || '').trim();
          const quantity = Number(String(args.quantity ?? args.qty ?? 1).replace(/[^\d.,]/g, '').replace(',', '.'));
          const unit = normUnit(args.unit || 'KG');
          if (!product_name) return { ok: false, error: 'ürün adı gerekli' };
          if (!isFinite(quantity) || quantity <= 0) return { ok: false, error: 'miktar pozitif olmalı' };
          // UPSERT (idempotent): anahtar = normalize ürün adı + birim. Eşleşirse miktarı güncelle,
          // eşleşmezse yeni satır ekle. Böylece toparlanma/retry çift satır oluşturmaz, düzeltmeler doğal çalışır.
          const itemKey = normName(product_name) + '|' + unit;
          const existingIdx = d.products.findIndex((p) => normName(p.product_name) + '|' + p.unit === itemKey);
          if (existingIdx >= 0) d.products[existingIdx] = { product_name, quantity, unit };
          else d.products.push({ product_name, quantity, unit });
          // Toplamı KATALOGDAN hesapla (LLM'in kendi hesabına güvenme) → AI bu değeri söylesin.
          let total = 0;
          try {
            total = await this.orderEngine.calculateTotal({ products: d.products } as AiOrderInput, tenantId);
          } catch { /* yoksay */ }
          return { ok: true, result: { products: d.products, total } };
        }
        case 'set_address': {
          const address = String(args.address || '').trim();
          const city = String(args.city || '').trim();
          const district = String(args.district || args.ilce || '').trim();
          if (address) d.customer.address = address;
          if (city) d.customer.city = city;
          if (district) d.customer.district = district;
          const missing = missingAddressParts(d.customer.address || '', d.customer.city, d.customer.district);
          return { ok: true, result: { address: d.customer.address, city: d.customer.city, district: d.customer.district, missing } };
        }
        case 'set_payment': {
          const p = normPayment(args.payment ?? args.method);
          if (!p) return { ok: false, error: 'geçersiz ödeme yöntemi (iban|website|paytr|iyzico|cash_on_delivery|kapida_kart)' };
          d.payment = p;
          return { ok: true, result: { payment: p } };
        }
        case 'set_invoice': {
          const company_name = String(args.company_name || args.company || args.firma || '').trim();
          const tax_number = String(args.tax_number || args.vkn || args.tckn || args.tax || '').replace(/[^\d]/g, '');
          d.invoice = d.invoice || {};
          if (company_name) d.invoice.company_name = company_name;
          if (tax_number) d.invoice.tax_number = tax_number;
          return { ok: true, result: { invoice: d.invoice } };
        }
        case 'confirm_order': {
          // İdempotent (FAZ 1): sipariş zaten oluştuysa hata yerine GÜNCELLE → onay sonrası değişiklik kaybolmaz.
          const alreadyCreated = !!(d.confirmed && d.order);
          const input: AiOrderInput = {
            customer: {
              name: String(d.customer.name || '').trim(),
              phone: String(d.customer.phone || '').replace(/[^\d]/g, ''),
              address: d.customer.address || undefined,
              city: d.customer.city || undefined,
              district: d.customer.district || undefined,
              company_name: d.invoice?.company_name || undefined,
              identity_number: d.invoice?.tax_number || undefined,
            },
            products: d.products,
            payment: d.payment as PaymentMethod,
            confirmed: true,
            confidence: 90,
            channel: 'phone',
            source: 'PHONE',
            notes: d.notes,
          };
          const v = this.validator.validate(input);
          if (!v.valid) {
            const errs = v.errors.join(' | ');
            return { ok: false, error: `EKSİK/GEÇERSİZ BİLGİ: ${errs}. Şu an sipariş OLUŞMADI. confirm_order'ı TEKRAR ÇAĞIRMA; kullanıcıdan eksik bilgiyi iste (örn. telefon için "Telefon numaranızı alabilir miyim efendim?"), ilgili araçla (set_customer/set_address) kaydet, SONRA confirm_order'ı çağır.` };
          }
          const order = alreadyCreated
            ? await this.orderEngine.updateOrder(d.order!.orderId, v.data, tenantId)
            : await this.orderEngine.process(v.data, tenantId);
          d.confirmed = true;
          d.order = { orderNumber: order.order_number, orderId: order.order_id, total: order.total_price, status: order.status };
          await this.recordSession(tenantId, sid, d, order);
          // H5: Sipariş oluşunca müşteriye özet gönder (WhatsApp → olmazsa SMS). Sadece ilk oluşturmada.
          if (!alreadyCreated) void this.sendOrderSummaryToCustomer(tenantId, d, order);
          return { ok: true, result: { orderNumber: order.order_number, orderId: order.order_id, total: order.total_price, status: order.status, updated: alreadyCreated } };
        }
        case 'update_order': {
          if (!d.confirmed || !d.order) {
            return { ok: false, error: 'Henüz onaylanmış sipariş yok. Önce siparişi onayla (confirm_order); sipariş oluştuktan SONRA değişiklik olursa update_order kullan.' };
          }
          const input: AiOrderInput = {
            customer: {
              name: String(d.customer.name || '').trim(),
              phone: String(d.customer.phone || '').replace(/[^\d]/g, ''),
              address: d.customer.address || undefined,
              city: d.customer.city || undefined,
              district: d.customer.district || undefined,
              company_name: d.invoice?.company_name || undefined,
              identity_number: d.invoice?.tax_number || undefined,
            },
            products: d.products,
            payment: d.payment as PaymentMethod,
            confirmed: true,
            confidence: 90,
            channel: 'phone',
            source: 'PHONE',
            notes: d.notes,
          };
          const uv = this.validator.validate(input);
          if (!uv.valid) {
            const errs = uv.errors.join(' | ');
            return { ok: false, error: `EKSİK/GEÇERSİZ BİLGİ: ${errs}. Sipariş GÜNCELLENMEDİ; eksik bilgiyi isteyip ilgili araçla kaydet, SONRA update_order'ı çağır.` };
          }
          const updated = await this.orderEngine.updateOrder(d.order.orderId, uv.data, tenantId);
          d.order = { orderNumber: updated.order_number, orderId: updated.order_id, total: updated.total_price, status: updated.status };
          await this.recordSession(tenantId, sid, d, updated);
          return { ok: true, result: { orderNumber: updated.order_number, orderId: updated.order_id, total: updated.total_price, status: updated.status, updated: true } };
        }
        case 'set_birthday': {
          const iso = parseBirthdayArg(args);
          if (!iso) {
            return { ok: false, error: 'Doğum günü anlaşılamadı. Gün, ay VE yılı (ör. 10 Şubat 1987) al ve gün/ay/yıl olarak gönder.' };
          }
          d.birthday = iso;
          // Doğum günü sipariş sonrası (veda) sorulur; müşteri zaten oluşmuştur → telefon+tenant ile bul ve yaz.
          const phone = String(d.customer.phone || '').replace(/[^\d]/g, '');
          let saved = false;
          if (phone) {
            try {
              const { data } = await this.supabase.db
                .from('customers')
                .update({ birth_date: iso })
                .eq('tenant_id', tenantId)
                .eq('phone', phone)
                .select('id')
                .maybeSingle();
              saved = !!data;
            } catch { /* yoksay */ }
          }
          return { ok: true, result: { birthday: iso, saved } };
        }
        case 'send_payment_info': {
          if (!d.order) return { ok: false, error: 'Henüz onaylanmış sipariş yok; önce siparişi onayla (confirm_order).' };
          const phone = String(d.customer.phone || '').replace(/[^\d]/g, '');
          if (!phone) return { ok: false, error: 'Müşteri telefonu yok; havale bilgileri gönderilemez. Telefonu set_customer ile kaydet.' };
          const body = await this.buildPaymentMessage(tenantId, d);
          const res = await this.outbound.send({ tenantId, channel: 'whatsapp', to: phone, body, orderId: d.order.orderId });
          return {
            ok: true,
            result: {
              sent: true,
              queued: !res.success,
              channel: 'whatsapp',
              to: phone,
              message: res.success
                ? 'Havale ve sipariş bilgileri WhatsApp üzerinden gönderildi.'
                : 'Havale ve sipariş bilgileri WhatsApp gönderimi için hazırlandı.',
            },
          };
        }
        case 'set_note': {
          const note = String(args.note || args.text || args.message || '').trim();
          if (!note) return { ok: false, error: 'Not metni gerekli.' };
          d.notes = d.notes ? `${d.notes}; ${note}` : note;
          return { ok: true, result: { notes: d.notes } };
        }
        case 'get_order_status': {
          const found = await this.findOrderForCaller(tenantId, d, args);
          if (!found) return { ok: false, error: 'Sipariş bulunamadı. Sipariş numarasını veya kayıtlı telefon numarasını teyit edin.' };
          return { ok: true, result: found };
        }
        case 'send_tracking': {
          const found = await this.findOrderForCaller(tenantId, d, args);
          if (!found) return { ok: false, error: 'Sipariş bulunamadı.' };
          const phone = String(found.customerPhone || d.customer.phone || '').replace(/[^\d]/g, '');
          if (!phone) return { ok: false, error: 'Telefon numarası yok; takip kodu gönderilemez.' };
          if (!found.trackingNumber) return { ok: false, error: 'Sipariş henüz kargoya verilmemiş; takip kodu oluşmamış.' };
          const body = `Sayın ${found.customerName || 'müşterimiz'}, #${found.orderNumber} nolu siparişiniz ${found.cargoCompany || 'kargo'} ile yola çıktı. Takip No: ${found.trackingNumber}`;
          const sent = await this.sendWhatsappThenSms(tenantId, phone, body, found.orderId);
          return { ok: true, result: { sent: sent.success, channel: sent.channel, trackingNumber: found.trackingNumber, cargoCompany: found.cargoCompany } };
        }
        case 'get_customer_address': {
          const phone = String(d.customer.phone || '').replace(/[^\d]/g, '');
          if (!phone) return { ok: false, error: 'Arayan numara yok.' };
          const { data } = await this.supabase.db.from('customers').select('name, address, city').eq('tenant_id', tenantId).eq('phone', phone).maybeSingle();
          const c = (data || {}) as any;
          if (!c.address && !c.city) return { ok: true, result: { found: false } };
          return { ok: true, result: { found: true, name: c.name || '', address: c.address || '', city: c.city || '' } };
        }
        case 'update_customer': {
          const phone = String(d.customer.phone || '').replace(/[^\d]/g, '');
          if (!phone) return { ok: false, error: 'Arayan numara yok; müşteri güncellenemez.' };
          const patch: Record<string, unknown> = {};
          const newAddress = String(args.address || '').trim();
          const newCity = String(args.city || '').trim();
          const newDistrict = String(args.district || '').trim();
          const newPhone = String(args.phone || '').replace(/[^\d]/g, '');
          if (newAddress) patch.address = newAddress;
          if (newCity) patch.city = newCity;
          if (newDistrict) patch.address = [String(patch.address || d.customer.address || ''), newDistrict].filter(Boolean).join(', ');
          if (newPhone && newPhone !== phone) patch.phone = newPhone;
          if (Object.keys(patch).length === 0) return { ok: false, error: 'Güncellenecek alan yok.' };
          await this.supabase.db.from('customers').update(patch).eq('tenant_id', tenantId).eq('phone', phone);
          if (patch.address) d.customer.address = String(patch.address);
          if (patch.city) d.customer.city = String(patch.city);
          if (newDistrict) d.customer.district = newDistrict;
          if (patch.phone) d.customer.phone = String(patch.phone);
          this.eventBus.emit(SystemEvents.HUMAN_REQUIRED, tenantId, {
            entityType: 'customer',
            description: `Müşteri bilgisi güncellendi: ${d.customer.name || phone} (${Object.keys(patch).join(', ')})`,
            customerName: d.customer.name || '', customerPhone: String(patch.phone || phone),
            channel: 'VOICE', priority: 'NORMAL',
          });
          return { ok: true, result: { updated: Object.keys(patch) } };
        }
        case 'cancel_order': {
          const found = await this.findOrderForCaller(tenantId, d, args);
          if (!found) return { ok: false, error: 'Sipariş bulunamadı.' };
          if (['shipped', 'completed', 'delivered'].includes(String(found.status || '').toLowerCase())) {
            return { ok: false, error: `#${found.orderNumber} kargoda/teslim edilmiş; iptal edilemez. Esnafa bildirildi.` };
          }
          await this.orderEngine.cancelOrder(found.orderId);
          this.eventBus.emit(SystemEvents.HUMAN_REQUIRED, tenantId, {
            entityType: 'order', orderNumber: found.orderNumber,
            description: `Müşteri #${found.orderNumber} nolu siparişi İPTAL etmek istiyor — aramanızı bekliyor.`,
            customerName: found.customerName, customerPhone: found.customerPhone,
            channel: 'VOICE', priority: 'URGENT',
          }, found.orderId);
          return { ok: true, result: { cancelled: true, orderNumber: found.orderNumber } };
        }
        case 'report_issue': {
          const description = String(args.description || args.text || args.message || '').trim();
          if (!description) return { ok: false, error: 'Talep/şikayet metni gerekli.' };
          const type = String(args.type || args.issue_type || 'other').trim();
          const result = await this.complaintProcessor.process({
            tenantId,
            customer: { name: d.customer.name || undefined, phone: d.customer.phone || undefined },
            orderId: d.order?.orderId,
            complaintType: type,
            complaintSeverity: String(args.severity || 'NORMAL').toUpperCase(),
            description,
            channel: 'phone',
            sessionId: sid,
          });
          return { ok: true, result: { ticketNumber: result.ticketNumber, created: result.created } };
        }
        case 'escalate':
          return { ok: true, result: { escalated: true, message: 'Görüşme insana devredilecek.' } };
        case 'sleep':
          return { ok: true, result: { sleep: true, message: 'Görüşme kapatılıyor.' } };
        default:
          return { ok: false, error: 'bilinmeyen araç: ' + tool };
      }
    } catch (e) {
      this.logger.warn(`order-ai tool ${tool} hata: ${(e as Error).message}`);
      return { ok: false, error: (e as Error).message };
    }
  }

  /** Havale/sipariş bilgileri WhatsApp mesajı (IBAN + sipariş detayı + tutar + kargo + adres + telefon). */
  private async buildPaymentMessage(tenantId: string, d: Draft): Promise<string> {
    const tl = (n: any) => Number(n || 0).toLocaleString('tr-TR');
    let tenantName = '';
    let iban = '';
    try {
      const { data } = await this.supabase.db.from('tenants').select('company_name, iban').eq('id', tenantId).maybeSingle();
      tenantName = String((data as any)?.company_name || '').trim();
      iban = String((data as any)?.iban || '').trim();
    } catch { /* yoksay */ }

    let cargoLine = '';
    try {
      const { data } = await this.supabase.db.from('tenant_settings')
        .select('cargo_default_price, cargo_free_enabled, cargo_free_type, cargo_free_weight, cargo_free_quantity, cargo_free_threshold')
        .eq('tenant_id', tenantId).maybeSingle();
      const c = (data || {}) as any;
      const kg = d.products.filter((p) => /kg|kilo/i.test(p.unit)).reduce((s, p) => s + Number(p.quantity || 0), 0);
      const adet = d.products.filter((p) => /adet|tane/i.test(p.unit)).reduce((s, p) => s + Number(p.quantity || 0), 0);
      let free = false;
      if (c.cargo_free_enabled) {
        const type = String(c.cargo_free_type || 'amount');
        if (type === 'weight' && Number(c.cargo_free_weight) > 0 && kg >= Number(c.cargo_free_weight)) free = true;
        else if (type === 'quantity' && Number(c.cargo_free_quantity) > 0 && adet >= Number(c.cargo_free_quantity)) free = true;
        else if (Number(c.cargo_free_threshold) > 0 && Number(d.order?.total || 0) >= Number(c.cargo_free_threshold)) free = true;
      }
      if (free) cargoLine = 'Kargo: Ücretsiz';
      else if (Number(c.cargo_default_price) > 0) cargoLine = `Kargo: ${tl(c.cargo_default_price)} TL`;
    } catch { /* yoksay */ }

    const items = d.products.map((p) => `${p.quantity} ${p.unit.toLowerCase()} ${p.product_name}`).join(', ');
    const address = [d.customer.address, d.customer.city].filter(Boolean).join(', ');
    return [
      `🧾 ${tenantName} — Sipariş Bilgileri`,
      `Sipariş No: #${d.order?.orderNumber || '-'}`,
      `Alıcı: ${d.customer.name || '-'}`,
      `Ürünler: ${items}`,
      `Toplam: ${tl(d.order?.total)} TL`,
      cargoLine,
      'Ödeme: Havale/EFT',
      iban ? `IBAN: ${iban}` : '',
      `Teslimat Adresi: ${address || '-'}`,
      `Telefon: ${d.customer.phone || '-'}`,
    ].filter(Boolean).join('\n');
  }

  /** Oturum kaydı (conversation_sessions) — sipariş oluşunca. */
  private async recordSession(tenantId: string, sessionId: string, d: Draft, order: { order_id: string; order_number: string; total_price: number }): Promise<void> {
    try {
      const now = new Date().toISOString();
      const summary = `${d.customer.name || 'Müşteri'} siparişi alındı (#${order.order_number}), ${d.products.length} kalem, ${order.total_price} TL.`;
      await this.supabase.db.from('conversation_sessions').insert({
        tenant_id: tenantId,
        channel: 'phone',
        phone: d.customer.phone || null,
        status: 'completed',
        session_label: `ORDER-AI-${Date.now()}`,
        ai_model: 'gemini-live',
        source: 'order-ai',
        order_id: order.order_id,
        started_at: new Date(d.createdAt).toISOString(),
        ended_at: now,
        created_at: now,
        session_data: {
          customer_name: d.customer.name || '',
          products: d.products.map((p) => p.product_name),
          items: d.products,
          payment: d.payment || '',
          address: d.customer.address || '',
          city: d.customer.city || '',
          district: d.customer.district || '',
          order_number: order.order_number,
          company_name: d.invoice?.company_name || '',
          tax_number: d.invoice?.tax_number || '',
          summary,
          external_session_id: sessionId,
        },
      });
    } catch (e) {
      const err = e as { message?: string; code?: string; details?: string; hint?: string };
      this.logger.error(
        `conversation_sessions kaydı başarısız: ${err?.message || String(e)} | code=${err?.code || ''} | details=${err?.details || ''} | hint=${err?.hint || ''}`,
      );
    }
  }

  /**
   * Sipariş ONAYLANMADAN/OLUŞMADAN kapanan çağrıyı conversation_sessions'a yazar.
   * status: 'no_confirm' (ürün alınmış ama onay yok) | 'abandoned' (hiç sipariş yok).
   */
  async recordSessionEnd(tenantId: string, sessionId: string): Promise<{ ok: boolean; status?: string; recorded?: boolean; reason?: string }> {
    const d = this.drafts.get(this.key(tenantId, sessionId));
    if (d?.confirmed) return { ok: true, status: 'completed', recorded: false, reason: 'onaylı sipariş zaten kayıtlı' };
    if (!d) return { ok: true, status: 'abandoned', recorded: false, reason: 'taslak yok' };
    const phone = String(d.customer.phone || '').replace(/[^\d]/g, '');
    const now = new Date().toISOString();
    const status = d.products.length > 0 ? 'no_confirm' : 'abandoned';
    try {
      await this.supabase.db.from('conversation_sessions').insert({
        tenant_id: tenantId,
        channel: 'phone',
        phone: phone || 'bilinmiyor',
        status,
        session_label: `ORDER-AI-${Date.now()}`,
        ai_model: 'gemini-live',
        source: 'order-ai',
        started_at: new Date(d.createdAt).toISOString(),
        ended_at: now,
        created_at: now,
        session_data: {
          outcome: status,
          customer_name: d.customer.name || '',
          products: d.products.map((p) => p.product_name),
          items: d.products,
          payment: d.payment || '',
          address: d.customer.address || '',
          city: d.customer.city || '',
          district: d.customer.district || '',
          notes: d.notes || '',
          external_session_id: sessionId,
        },
      });
      return { ok: true, status, recorded: true };
    } catch (e) {
      const err = e as { message?: string; code?: string; details?: string; hint?: string };
      this.logger.error(
        `recordSessionEnd kaydı başarısız: ${err?.message || String(e)} | code=${err?.code || ''} | details=${err?.details || ''} | hint=${err?.hint || ''}`,
      );
      return { ok: false, reason: err?.message || String(e) };
    }
  }

  /** Sesli görüşmenin gerçek transkriptini ai_audit_logs'a yazar (detay sayfası buradan okur). */
  async recordTranscript(
    tenantId: string,
    sessionId: string,
    messages: Array<{ role: string; text: string; at?: number }>,
  ): Promise<{ ok: boolean; count?: number }> {
    try {
      // Oda adı (room) -> conversation_sessions.id (detay bu id ile arıyor).
      let dbSessionId: string | null = null;
      try {
        const { data } = await this.supabase.db
          .from('conversation_sessions')
          .select('id, session_data')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(30);
        const m = (data || []).find((s) => (s.session_data as Record<string, unknown> | null)?.external_session_id === sessionId);
        dbSessionId = m?.id || null;
      } catch { /* yoksay */ }

      const rows = (messages || [])
        .filter((m) => m && String(m.text || '').trim())
        .map((m) => ({
          tenant_id: tenantId,
          session_id: dbSessionId || sessionId,
          user_message: m.role === 'user' ? String(m.text).trim() : null,
          raw_response: m.role === 'assistant' ? String(m.text).trim() : null,
          model: 'livekit-pipeline',
          provider: 'livekit',
          success: true,
          ...(m.at ? { created_at: new Date(m.at).toISOString() } : {}),
        }));
      if (!rows.length) return { ok: true, count: 0 };
      const { error } = await this.supabase.db.from('ai_audit_logs').insert(rows);
      if (error) throw error;
      return { ok: true, count: rows.length };
    } catch (e) {
      this.logger.error(`recordTranscript başarısız: ${(e as Error).message}`);
      return { ok: false };
    }
  }

  /** Görüşme ses kaydını call_recordings'e yazar (esnaf panelden dinler). */
  async recordRecording(
    tenantId: string,
    sessionId: string,
    phone: string,
    file: string,
  ): Promise<{ ok: boolean }> {
    try {
    // room adı (external_session_id) -> conversation_sessions.id
    let dbSessionId: string | null = null;
    try {
      const { data } = await this.supabase.db
        .from('conversation_sessions')
        .select('id, session_data')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(30);
      const m = (data || []).find((s) => (s.session_data as Record<string, unknown> | null)?.external_session_id === sessionId);
      dbSessionId = m?.id || null;

      // Fallback: cut-off/kısa aramada external_session_id yazılmamış olabilir.
      // Aynı telefonun en son oturumuna bağla (2 dk içinde oluşmuşsa).
      if (!dbSessionId) {
        const phoneClean = String(phone || '').replace(/[^\d]/g, '');
        const recent = (data || []) as any[];
        const match = recent.find((s) => {
          const sd = (s.session_data || {}) as Record<string, unknown>;
          const sp = String(s.phone || sd.phone || '').replace(/[^\d]/g, '');
          return (!phoneClean || !sp || sp.endsWith(phoneClean.slice(-10))) && !s.id.startsWith('0000');
        });
        if (match) dbSessionId = match.id;
      }
    } catch { /* yoksay */ }

      const url = `/api/order-ai/agent/recordings/${encodeURIComponent(file)}`;
      await this.supabase.db.from('call_recordings').insert({
        tenant_id: tenantId,
        session_id: dbSessionId,
        phone: String(phone || '').replace(/[^\d]/g, '') || 'bilinmiyor',
        direction: 'incoming',
        recording_url: url,
        status: 'completed',
        created_at: new Date().toISOString(),
      });
      return { ok: true };
    } catch (e) {
      this.logger.error(`recordRecording başarısız: ${(e as Error).message}`);
      return { ok: false };
    }
  }

  /** Günlük temizlik: retention süresini aşan ses kayıtlarını (DB + dosya) siler. */
  @Cron('0 3 * * *')
  async cleanupOldRecordings(): Promise<void> {
    try {
      const { data: settings } = await this.supabase.db
        .from('tenant_settings')
        .select('tenant_id, recording_retention_days, auto_cleanup_enabled')
        .eq('auto_cleanup_enabled', true);
      const dir = 'C:\\SiparisAsistani\\apps\\api\\backups\\recordings';
      for (const s of (settings || []) as Array<Record<string, unknown>>) {
        const days = Number(s.recording_retention_days) || 15;
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { data: old } = await this.supabase.db
          .from('call_recordings')
          .select('id, recording_url')
          .eq('tenant_id', String(s.tenant_id))
          .lt('created_at', cutoff);
        const rows = (old || []) as Array<{ id: string; recording_url?: string }>;
        if (!rows.length) continue;
        for (const r of rows) {
          try {
            const file = String(r.recording_url || '').split('/').pop() || '';
            if (file) fs.rmSync(path.join(dir, decodeURIComponent(file)), { force: true });
          } catch { /* yoksay */ }
        }
        await this.supabase.db.from('call_recordings').delete().in('id', rows.map((x) => x.id));
      }
    } catch (e) {
      this.logger.warn(`kayıt temizliği hatası: ${(e as Error).message}`);
    }
  }

  /** Sipariş no veya arayan telefonla sipariş bul (ses ajanı araçları için). */
  private async findOrderForCaller(
    tenantId: string,
    d: Draft,
    args: Record<string, unknown>,
  ): Promise<{
    orderId: string; orderNumber: string; status: string; total: number;
    cargoCompany: string; trackingNumber: string; customerName: string; customerPhone: string; createdAt: string;
  } | null> {
    const wanted = String(args.order_number || args.orderNumber || args.no || '').trim();
    const phone = String(args.phone || d.customer.phone || '').replace(/[^\d]/g, '');
    const sel = 'id, order_number, status, total_price, cargo_company, tracking_number, created_at, customer:customer_id(name, phone)';
    try {
      if (wanted) {
        const { data } = await this.supabase.db.from('orders').select(sel)
          .eq('tenant_id', tenantId).eq('order_number', wanted).maybeSingle();
        if (data) return this.mapOrder(data);
      }
      if (phone) {
        const { data: cust } = await this.supabase.db.from('customers').select('id')
          .eq('tenant_id', tenantId).eq('phone', phone).maybeSingle();
        if (cust) {
          const { data } = await this.supabase.db.from('orders').select(sel)
            .eq('tenant_id', tenantId).eq('customer_id', (cust as any).id)
            .order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (data) return this.mapOrder(data);
        }
      }
    } catch { /* yoksay */ }
    return null;
  }

  private mapOrder(o: any) {
    const c = (o.customer || {}) as any;
    return {
      orderId: String(o.id), orderNumber: String(o.order_number), status: String(o.status),
      total: Number(o.total_price || 0), cargoCompany: String(o.cargo_company || ''),
      trackingNumber: String(o.tracking_number || ''), customerName: String(c.name || ''),
      customerPhone: String(c.phone || ''), createdAt: String(o.created_at || ''),
    };
  }

  /** H5: Sipariş oluşunca müşteriye özet gönder (WhatsApp → olmazsa SMS). */
  private async sendOrderSummaryToCustomer(tenantId: string, d: Draft, order: { order_number: string; total_price: number }): Promise<void> {
    try {
      const phone = String(d.customer.phone || '').replace(/[^\d]/g, '');
      if (!phone) return;
      const tl = (n: number) => Number(n || 0).toLocaleString('tr-TR');
      const items = d.products.map((p) => `${p.quantity} ${String(p.unit).toLowerCase()} ${p.product_name}`).join(', ');
      const address = [d.customer.address, d.customer.city].filter(Boolean).join(', ');
      const body = [
        `Siparişiniz alındı. Sipariş No: #${order.order_number}`,
        `Ürünler: ${items}`,
        `Toplam: ${tl(order.total_price)} TL`,
        address ? `Teslimat: ${address}` : '',
        'Bilgi için bizi arayabilirsiniz. Afiyet olsun!',
      ].filter(Boolean).join('\n');
      await this.sendWhatsappThenSms(tenantId, phone, body, d.order?.orderId);
    } catch { /* yoksay */ }
  }

  /** WhatsApp önce; başarısızsa SMS (FAZ 1). */
  private async sendWhatsappThenSms(tenantId: string, to: string, body: string, orderId?: string): Promise<{ success: boolean; channel: string }> {
    try {
      const wa = await this.outbound.send({ tenantId, channel: 'whatsapp', to, body, orderId });
      if (wa.success) return { success: true, channel: 'whatsapp' };
    } catch { /* yoksay */ }
    try {
      const sms = await this.outbound.send({ tenantId, channel: 'sms', to, body, orderId });
      if (sms.success) return { success: true, channel: 'sms' };
    } catch { /* yoksay */ }
    return { success: false, channel: 'none' };
  }
}
