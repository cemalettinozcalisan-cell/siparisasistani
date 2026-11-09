import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { VoiceService } from '../voice/voice.service';
import { AiEmployeeService, AiEmployeeConfig } from './ai-employee.service';
import { AiPricingService } from './ai-pricing.service';

const SALUTATION_MAP: Record<string, string> = {
  patron: 'Patron',
  usta: 'Ustam',
  bey: 'Beyefendi',
  hanim: 'Hanımefendi',
  abi: 'Abi',
  kardesim: 'Kardeşim',
  ozel: '',
};

const EVENT_PREF_KEY: Record<string, string> = {
  ORDER_CREATED: 'order_voice',
  ORDER_UPDATED: 'order_voice',
  ORDER_PAYMENT_CONFIRMED: 'order_voice',
  ORDER_CANCELLED: 'order_voice',
  ORDER_CANCEL_REQUESTED: 'order_voice',
  REQUEST_CREATED: 'request_voice',
  COMPLAINT_CREATED: 'complaint_voice',
  SUBSCRIPTION_THRESHOLD: 'subscription_voice',
};

const EVENT_LABEL: Record<string, string> = {
  ORDER_CREATED: 'yeni sipariş',
  ORDER_UPDATED: 'güncellenen sipariş',
  ORDER_PAYMENT_CONFIRMED: 'ödeme onayı',
  ORDER_CANCELLED: 'iptal edilen sipariş',
  ORDER_CANCEL_REQUESTED: 'iptal talebi',
  REQUEST_CREATED: 'müşteri talebi',
  COMPLAINT_CREATED: 'müşteri şikâyeti',
  SUBSCRIPTION_THRESHOLD: 'abonelik uyarısı',
};

const CHANNEL_LABEL: Record<string, string> = {
  phone: 'TELEFON',
  whatsapp: 'WHATSAPP',
  instagram: 'INSTAGRAM',
  sms: 'SMS',
  web: 'WEB',
  website: 'WEB',
  manual: 'PANEL',
  panel: 'PANEL',
  wholesale: 'TOPTAN',
};

const TR_BIRLER = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TR_ONLAR = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];

function trNumber(n: number): string {
  if (!isFinite(n)) return '';
  if (n === 0) return 'sıfır';
  if (n < 0) return 'eksi ' + trNumber(-n);
  const units = ['', 'bin', 'milyon', 'milyar', 'trilyon'];
  let out = '';
  let g = 0;
  while (n > 0) {
    const part = n % 1000;
    if (part > 0) {
      const yuz = Math.floor(part / 100);
      const onbir = part % 100;
      let p = '';
      if (yuz === 1) p = 'yüz';
      else if (yuz > 1) p = TR_BIRLER[yuz] + ' yüz';
      if (onbir > 0) {
        const on = Math.floor(onbir / 10);
        const bir = onbir % 10;
        if (on) p += (p ? ' ' : '') + TR_ONLAR[on];
        if (bir) p += (p ? ' ' : '') + TR_BIRLER[bir];
      }
      // "bir bin" değil "bin" (1000); ama "bir milyon" korunur
      const prefix = units[g] === 'bin' && part === 1 ? '' : p;
      out = (prefix + (units[g] ? ' ' + units[g] : '')) + (out ? ' ' + out : '');
    }
    n = Math.floor(n / 1000);
    g++;
  }
  return out.trim();
}

/** TTS öncesi sayı→Türkçe kelime normalizasyonu ("34" → "otuz dört", "TL" → "lira"). */
function trDigit(ch: string): string {
  if (ch === '0') return 'sıfır';
  return TR_BIRLER[Number(ch)] || ch;
}

/**
 * Sipariş numarasını sıfırları koruyarak okur.
 * Örn. "26-00197" -> "yirmi altı, sıfır sıfır, yüz doksan yedi"
 */
function readOrderNumber(value: string): string {
  const [prefix, seq] = value.split('-');
  const parts: string[] = [];
  if (prefix) parts.push(trNumber(parseInt(prefix, 10) || 0));
  if (seq) {
    const m = seq.match(/^(0+)(\d*)$/);
    if (m) {
      if (m[1]) parts.push(m[1].split('').map(() => 'sıfır').join(' '));
      if (m[2]) parts.push(trNumber(parseInt(m[2], 10) || 0));
    } else {
      parts.push(trNumber(parseInt(seq, 10) || 0));
    }
  }
  return parts.filter(Boolean).join(', ');
}

function normalizeTrNumbers(text: string): string {
  // Sipariş no (ör. 26-00197): genel sayı dönüşümünden ÖNCE, sıfırları koruyarak oku.
  text = text.replace(/\b(\d{1,4})-(\d{3,})\b/g, (_m, a, b) => readOrderNumber(`${a}-${b}`));
  // Telefon numaraları: para gibi değil, rakam rakam okunur (9-13 hane)
  text = text.replace(/(\+?\d[\d\s-]{9,16})/g, (m) => {
    const digits = m.replace(/[^\d]/g, '');
    if (digits.length >= 9 && digits.length <= 13) return digits.split('').map(trDigit).join(' ');
    return m;
  });
  return text
    .replace(/TL/gi, 'lira')
    .replace(/\d[\d.,]*/g, (m) => {
      const neg = false; // negatif yok: sipariş no'daki "26-00186" gibi tireler "eksi" okunmasın
      const body = m.replace('-', '');
      if (body.includes(',')) {
        const [i, d] = body.split(',');
        const int = trNumber(parseInt(i.replace(/\./g, ''), 10) || 0);
        const dec = d.split('').map(trDigit).join(' ');
        return (neg ? 'eksi ' : '') + `${int} virgül ${dec}`.trim();
      }
      // nokta-ondalık (1-2 hane) → "X virgül Y"; 3 hane → binlik ayracı
      const lastDot = body.lastIndexOf('.');
      const afterDot = lastDot >= 0 ? body.slice(lastDot + 1) : '';
      if (body.includes('.') && (afterDot.length === 1 || afterDot.length === 2)) {
        const int = trNumber(parseInt(body.slice(0, lastDot).replace(/\./g, ''), 10) || 0);
        const dec = afterDot.split('').map(trDigit).join(' ');
        return (neg ? 'eksi ' : '') + `${int} virgül ${dec}`.trim();
      }
      const clean = body.replace(/\./g, ''); // "1.500" → 1500 (tr binlik ayracı)
      const n = parseInt(clean, 10);
      if (!isFinite(n)) return m;
      return (neg ? 'eksi ' : '') + trNumber(n);
    });
}

@Injectable()
export class VoiceNotificationService {
  private readonly logger = new Logger(VoiceNotificationService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly voice: VoiceService,
    private readonly aiEmployee: AiEmployeeService,
    private readonly pricing: AiPricingService,
  ) {}

  /** Bir event'i sesli bildirim kuyruğuna ekler (idempotent). */
  async enqueue(eventType: string, tenantId: string, payload: Record<string, unknown>, entityId?: string): Promise<void> {
    const tag = `[voice:${eventType}]`;
    try {
      const cfg = await this.aiEmployee.get(tenantId).catch((e) => {
        this.logger.warn(`${tag} config okunamadi: ${(e as Error).message}`);
        return null;
      });
      if (!cfg) { this.logger.warn(`${tag} atlandi: config yok (tenant=${tenantId})`); return; }
      if (!cfg.enabled) { this.logger.log(`${tag} atlandi: AI calisan enabled=false`); return; }

      const prefKey = EVENT_PREF_KEY[eventType];
      if (prefKey) {
        const prefs = (cfg.notification_preferences || {}) as Record<string, boolean>;
        if (prefs[prefKey] === false) { this.logger.log(`${tag} atlandi: ${prefKey}=false`); return; }
      }

      const changeKey =
        eventType === 'ORDER_UPDATED' ? String(payload.changeKey || payload.changeSummary || '') : '';
      const dedupKey = `${eventType}:${entityId || String(payload.id || payload.orderId || payload.ticket_number || '')}${changeKey ? ':' + changeKey : ''}`;
      const { data: existing } = await this.supabase.db
        .from('ai_voice_notifications')
        .select('id')
        .eq('dedup_key', dedupKey)
        .maybeSingle();
      if (existing) { this.logger.log(`${tag} atlandi: dedup ${dedupKey}`); return; } // idempotency

      const text = this.buildText(eventType, cfg, payload);
      const { error } = await this.supabase.db.from('ai_voice_notifications').insert({
        tenant_id: tenantId,
        event_type: eventType,
        entity_id: entityId || null,
        dedup_key: dedupKey || null,
        voice_text: text,
        priority: eventType === 'ORDER_CREATED' ? 1 : 5,
        status: 'pending',
      });
      if (error) { this.logger.warn(`${tag} insert hatasi: ${error.message}`); return; }
      this.logger.log(`${tag} kuyruga eklendi: "${String(text).slice(0, 70)}"`);
    } catch (e) {
      this.logger.warn(`${tag} enqueue failed: ${(e as Error).message}`);
    }
  }

  /** Bekleyen bildirimleri gruplar, özet üretir ve delivered'a geçirir. */
  async getPending(tenantId: string): Promise<{ quiet: boolean; summary: string | null; items: { id: string; event_type: string; voice_text: string }[] }> {
    const cfg = await this.aiEmployee.get(tenantId).catch(() => null);
    const quiet = cfg ? this.isQuietHours(cfg) : false;

    if (quiet) return { quiet: true, summary: null, items: [] };

    const { data } = await this.supabase.db
      .from('ai_voice_notifications')
      .select('*')
      .eq('tenant_id', tenantId)
      .or('status.eq.pending,status.eq.delivered')
      .is('acknowledged_at', null)
      .order('created_at', { ascending: true })
      .limit(50);

    const rows = (data || []) as any[];
    if (rows.length === 0) return { quiet: false, summary: null, items: [] };

    // delivered'a geçir (reconnect'te tekrar seslendirme)
    const ids = rows.map((r) => r.id);
    await this.supabase.db
      .from('ai_voice_notifications')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .in('id', ids);

    // Grup özeti
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.event_type] = (counts[r.event_type] || 0) + 1;
    const parts = Object.entries(counts).map(([evt, n]) => `${n} ${EVENT_LABEL[evt] || 'bildirim'}`);
    const sal = this.salutation(cfg);
    const summary = `${sal}, ${parts.join(' ve ')} oluştu. Detayları isterseniz söyleyin.`;

    return {
      quiet: false,
      summary,
      items: rows.map((r) => ({ id: r.id, event_type: r.event_type, voice_text: r.voice_text })),
    };
  }

  async acknowledge(tenantId: string, id: string): Promise<void> {
    await this.supabase.db
      .from('ai_voice_notifications')
      .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);
  }

  /** Metni seslendirir ve oynatılabilir URL döner. */
  async speak(tenantId: string, text: string): Promise<string | null> {
    try {
      const normalized = normalizeTrNumbers(text);
      const result = await this.voice.generateSpeech(normalized, tenantId);
      const fileName = `voice/ai-employee/${tenantId}/${Date.now()}.mp3`;

      // voice-cache bucket yoksa oluştur (kendini idare et)
      const bucketCheck = await this.supabase.db.storage.getBucket('voice-cache');
      if (bucketCheck.error) {
        await this.supabase.db.storage.createBucket('voice-cache', { public: true });
      }

      await this.supabase.db.storage.from('voice-cache').upload(fileName, result.audio, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

      // Notification TTS maliyeti (konuşma bütçesinden AYRI kayıt)
      try {
        const chars = text.length;
        const cost = await this.pricing.costFor('elevenlabs', 'tts', chars, 0);
        await this.supabase.db.from('ai_employee_usage').insert({
          tenant_id: tenantId,
          kind: 'notification',
          duration_sec: 0,
          input_tokens: chars,
          output_tokens: 0,
          provider: 'elevenlabs',
          cost_estimate: cost,
          note: text.slice(0, 120),
        });
      } catch { /* sessiz */ }

      return `${process.env.SUPABASE_URL}/storage/v1/object/public/voice-cache/${fileName}`;
    } catch (e) {
      this.logger.warn(`Voice speak failed: ${(e as Error).message}`);
      return null;
    }
  }

  private buildText(eventType: string, cfg: AiEmployeeConfig, payload: Record<string, unknown>): string {
    const sal = this.salutation(cfg);
    const num = payload.orderNumber ? `#${String(payload.orderNumber)}` : '';
    const price = payload.totalPrice ? `${Number(payload.totalPrice).toLocaleString('tr-TR')} TL` : '';
    const channel = this.channelLabel(payload.channel, payload.source);
    const cust = String(payload.customerName || '').trim();
    const city = String(payload.city || '').trim();
    const district = String(payload.district || '').trim();
    const address = String(payload.address || '').trim();
    const loc = [district, city].filter(Boolean).join(', ') || address;
    const items = Array.isArray(payload.items)
      ? (payload.items as Array<{ name?: string; product_name?: string; quantity?: number; unit?: string }>)
          .filter((i) => i && (i.name || i.product_name))
          .map((i) => `${i.quantity ?? ''} ${i.unit || ''} ${i.name || i.product_name || ''}`.trim())
          .join(', ')
      : '';

    if (eventType === 'ORDER_CREATED') {
      const payment = this.paymentLabel(payload.paymentMethod, payload.paymentStatus);
      return `${sal}, yeni siparişiniz var${num ? ' ' + num : ''}${channel ? ' (' + channel + ')' : ''}.`
        + `${cust ? ' Müşteri ' + cust + '.' : ''}`
        + `${loc ? ' ' + loc + '.' : ''}`
        + `${items ? ' Ürünler: ' + items + '.' : ''}`
        + `${price ? ' Tutar ' + price + '.' : ''}`
        + `${payment ? ' ' + payment : ''}`;
    }
    if (eventType === 'ORDER_UPDATED') {
      const change = String(payload.changeSummary || payload.description || 'Sipariş güncellendi').trim();
      return `${sal}, ${num ? num + ' nolu ' : ''}siparişte değişiklik var: ${change}`
        + `${price ? ' Yeni toplam ' + price + '.' : ''}`;
    }
    if (eventType === 'ORDER_PAYMENT_CONFIRMED') {
      return `${sal}, ${num ? num + ' numaralı ' : ''}siparişin havale ödemesi tamamlandı, lütfen kontrol edin.`
        + `${cust ? ' Müşteri ' + cust + '.' : ''}`
        + `${price ? ' Tutar ' + price + '.' : ''}`;
    }
    if (eventType === 'ORDER_CANCELLED') {
      return `${sal}, ${num ? num + ' nolu ' : ''}sipariş müşteri tarafından iptal edildi.`
        + `${cust ? ' Müşteri ' + cust + '.' : ''}`;
    }
    if (eventType === 'ORDER_CANCEL_REQUESTED') {
      return `${sal}, ${num ? num + ' nolu ' : ''}sipariş müşteri tarafından iptal edilmek isteniyor, lütfen kontrol edin.`
        + `${cust ? ' Müşteri ' + cust + '.' : ''}`;
    }
    if (eventType === 'COMPLAINT_CREATED') {
      return `${sal}, bir müşterimiz şikâyet kaydı oluşturdu. Detaylarını panelden inceleyebilirsiniz.`;
    }
    if (eventType === 'REQUEST_CREATED') {
      return `${sal}, bir müşterimiz sipariş vermedi ancak bir talep iletti. Detaylarını panelden inceleyebilirsiniz.`;
    }
    if (eventType === 'SUBSCRIPTION_THRESHOLD') {
      return `${sal}, sipariş hakkımız ${payload.remaining != null ? payload.remaining : ''} adede düştü.`;
    }
    return `${sal}, yeni bir bildiriminiz var.`;
  }

  private channelLabel(channel: unknown, source: unknown): string {
    const key = String(channel || source || '').trim().toLowerCase();
    return CHANNEL_LABEL[key] || (key ? key.toUpperCase() : '');
  }

  private paymentLabel(method: unknown, status: unknown): string {
    const m = String(method || '').trim().toLowerCase();
    const s = String(status || '').trim().toLowerCase();
    if (m === 'iban' || m === 'havale') {
      return ['dekont_alindi', 'paid', 'confirmed'].includes(s)
        ? 'Ödeme alındı.'
        : 'Ödeme bekliyor (havale/IBAN).';
    }
    if (m === 'kapida_kart' || m === 'cash_on_delivery' || m === 'cod' || m === 'kapida_nakit') {
      return 'Kapıda ödeme.';
    }
    if (m === 'paytr' || m === 'iyzico' || m === 'website' || m === 'online') {
      return s === 'paid' ? 'Ödeme alındı.' : 'Online ödeme.';
    }
    return '';
  }

  private salutation(cfg: AiEmployeeConfig | null): string {
    if (!cfg) return 'Patron';
    if (cfg.salutation === 'ozel') return cfg.custom_salutation || 'Patron';
    return SALUTATION_MAP[cfg.salutation] || 'Patron';
  }

  private isQuietHours(cfg: AiEmployeeConfig): boolean {
    const start = cfg.quiet_hours_start;
    const end = cfg.quiet_hours_end;
    if (!start || !end) return false;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const s = sh * 60 + sm;
    const e = eh * 60 + em;
    if (s === e) return false;
    if (s < e) return mins >= s && mins < e;
    return mins >= s || mins < e; // gece yarısını aşan aralık
  }
}