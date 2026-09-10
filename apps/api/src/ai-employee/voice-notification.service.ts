import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { VoiceService } from '../voice/voice.service';
import { AiEmployeeService, AiEmployeeConfig } from './ai-employee.service';

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
  REQUEST_CREATED: 'request_voice',
  COMPLAINT_CREATED: 'complaint_voice',
  SUBSCRIPTION_THRESHOLD: 'subscription_voice',
};

const EVENT_LABEL: Record<string, string> = {
  ORDER_CREATED: 'yeni sipariş',
  REQUEST_CREATED: 'müşteri talebi',
  COMPLAINT_CREATED: 'müşteri şikâyeti',
  SUBSCRIPTION_THRESHOLD: 'abonelik uyarısı',
};

@Injectable()
export class VoiceNotificationService {
  private readonly logger = new Logger(VoiceNotificationService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly voice: VoiceService,
    private readonly aiEmployee: AiEmployeeService,
  ) {}

  /** Bir event'i sesli bildirim kuyruğuna ekler (idempotent). */
  async enqueue(eventType: string, tenantId: string, payload: Record<string, unknown>, entityId?: string): Promise<void> {
    try {
      const cfg = await this.aiEmployee.get(tenantId).catch(() => null);
      if (!cfg || !cfg.enabled) return;

      const prefKey = EVENT_PREF_KEY[eventType];
      if (prefKey) {
        const prefs = (cfg.notification_preferences || {}) as Record<string, boolean>;
        if (prefs[prefKey] === false) return;
      }

      const dedupKey = `${eventType}:${entityId || String(payload.id || payload.orderId || payload.ticket_number || '')}`;
      const { data: existing } = await this.supabase.db
        .from('ai_voice_notifications')
        .select('id')
        .eq('dedup_key', dedupKey)
        .maybeSingle();
      if (existing) return; // idempotency

      const text = this.buildText(eventType, cfg, payload);
      await this.supabase.db.from('ai_voice_notifications').insert({
        tenant_id: tenantId,
        event_type: eventType,
        entity_id: entityId || null,
        dedup_key: dedupKey || null,
        voice_text: text,
        priority: eventType === 'ORDER_CREATED' ? 1 : 5,
        status: 'pending',
      });
    } catch (e) {
      this.logger.warn(`Voice enqueue failed: ${(e as Error).message}`);
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
      .eq('status', 'pending')
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
      const result = await this.voice.generateSpeech(text, tenantId);
      const fileName = `voice/ai-employee/${tenantId}/${Date.now()}.mp3`;
      await this.supabase.db.storage.from('voice-cache').upload(fileName, result.audio, {
        contentType: 'audio/mpeg',
        upsert: true,
      });
      return `${process.env.SUPABASE_URL}/storage/v1/object/public/voice-cache/${fileName}`;
    } catch (e) {
      this.logger.warn(`Voice speak failed: ${(e as Error).message}`);
      return null;
    }
  }

  private buildText(eventType: string, cfg: AiEmployeeConfig, payload: Record<string, unknown>): string {
    const sal = this.salutation(cfg);
    if (eventType === 'ORDER_CREATED') {
      const num = payload.orderNumber ? `#${payload.orderNumber}` : '';
      const price = payload.totalPrice ? `${Number(payload.totalPrice).toLocaleString('tr-TR')} TL` : '';
      const chan = payload.channel ? ` (${String(payload.channel).toUpperCase()})` : '';
      return `${sal}, yeni siparişiniz var${num ? ' ' + num : ''}${chan}.${price ? ' Tutar ' + price : ''}`;
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