import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import { SupabaseService } from '../common/supabase.client';
import { OutboundService } from '../messages/outbound.service';

@Injectable()
export class AlertRouterService {
  private readonly logger = new Logger(AlertRouterService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly outbound: OutboundService,
  ) {}

  /** Owner bildirim ayarlarını okur (tek satır) */
  async getSettings() {
    const { data } = await this.supabase.db
      .from('admin_alert_settings')
      .select('*')
      .single();
    return data || null;
  }

  /** Owner ayarlarını günceller */
  async updateSettings(body: Record<string, unknown>) {
    const allowed = [
      'owner_email', 'whatsapp_phone', 'sms_phone',
      'email_enabled', 'whatsapp_enabled', 'sms_enabled',
      'aggregation_threshold', 'aggregation_window_min',
    ];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) {
      if (body[k] !== undefined) patch[k] = body[k];
    }
    patch.updated_at = new Date().toISOString();
    const { data, error } = await this.supabase.db
      .from('admin_alert_settings')
      .update(patch)
      .eq('id', '00000000-0000-0000-0000-000000000099')
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Cron: henüz harici bildirimi yapılmamış, çözülmemiş arızaları işler.
   * Her arızayı esnaf adıyla çözerek kanallara dağıtır.
   * Aynı arıza bir kez işlenir (external_notified flag'i).
   */
  @Cron('*/2 * * * * *')
  async processPendingAlerts() {
    const settings = await this.getSettings();
    if (!settings) return;

    // Owner bildirim için en az bir kanal açık mı?
    const anyChannel = settings.email_enabled || settings.whatsapp_enabled || settings.sms_enabled;
    if (!anyChannel) return;

    const { data: alerts } = await this.supabase.db
      .from('channel_health_alerts')
      .select('id, tenant_id, channel, alert_type, message, fired_at')
      .eq('external_notified', false)
      .is('resolved_at', null)
      .order('fired_at', { ascending: true })
      .limit(20);

    if (!alerts?.length) return;

    // Esnaf adlarını topluca çöz
    const tenantIds = [...new Set(alerts.map((a) => a.tenant_id))];
    const names = await this.resolveTenantNames(tenantIds);

    // Toplulaştırma: aynı imza (channel + hata kodu) + pencere içindeki arızalar
    const threshold = Number(settings.aggregation_threshold || 2);
    const windowMin = Number(settings.aggregation_window_min || 5);
    const groups = this.groupBySignature(alerts, windowMin);

    for (const g of groups) {
      if (g.items.length >= threshold) {
        await this.sendAggregated(g, names, settings);
      } else {
        for (const item of g.items) {
          await this.sendIndividual(item, names, settings);
        }
      }
      // İşlenen arızaları işaretle
      await this.supabase.db
        .from('channel_health_alerts')
        .update({ external_notified: true })
        .in('id', g.items.map((i) => i.id));
    }
  }

  private groupBySignature(alerts: Record<string, any>[], windowMin: number) {
    const groups: { signature: string; items: Record<string, any>[] }[] = [];
    const now = Date.now();
    for (const a of alerts) {
      const sig = `${a.channel || ''}|${this.errorCodeFromMessage(a)}`;
      const fired = new Date(a.fired_at).getTime();
      if (now - fired > windowMin * 60000) continue; // pencerenin dışındaki eski arızaları tek tek işle
      const existing = groups.find((g) => g.signature === sig);
      if (existing) existing.items.push(a);
      else groups.push({ signature: sig, items: [a] });
    }
    return groups;
  }

  private errorCodeFromMessage(alert: Record<string, any>): string {
    // alert.alert_type = degraded | down | token_expired | expiring_soon
    // message içinde TOKEN_EXPIRED gibi kodlar olabilir.
    const type = String(alert.alert_type || '');
    const msg = String(alert.message || '');
    const m = msg.match(/\(([A-Z_]+)\)/);
    return m ? m[1] : type;
  }

  private async resolveTenantNames(tenantIds: string[]): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    if (!tenantIds.length) return map;
    const { data } = await this.supabase.db
      .from('tenants')
      .select('id, company_name')
      .in('id', tenantIds);
    for (const t of data || []) {
      map[t.id] = t.company_name || 'İsimsiz';
    }
    return map;
  }

  private async sendIndividual(item: Record<string, any>, names: Record<string, string>, settings: Record<string, any>) {
    const tenantName = names[item.tenant_id] || 'İsimsiz Esnaf';
    const time = new Date(item.fired_at).toLocaleString('tr-TR');
    const code = this.errorCodeFromMessage(item);
    const body = [
      `⚠️ ARİZA: ${tenantName}`,
      `Kanal: ${item.channel || '?'}`,
      `Sorun: ${item.message || item.alert_type}${code ? ` (${code})` : ''}`,
      `Zaman: ${time}`,
      `Çözüm: ${this.solutionFor(item.channel, code)}`,
      `Detay: /admin > Esnaf Kanal Sağlığı`,
    ].filter(Boolean).join('\n');
    await this.dispatch(settings, body, `⚠️ ARİZA: ${tenantName} — ${item.channel || '?'}`);
  }

  private async sendAggregated(group: { signature: string; items: Record<string, any>[] }, names: Record<string, string>, settings: Record<string, any>) {
    const [ch, code] = group.signature.split('|');
    const tenantList = group.items.map((i) => names[i.tenant_id] || 'İsimsiz').join(', ');
    const body = [
      `⚠️ SİSTEM GENELİ: ${group.items.length} esnafta sorun`,
      `Ortak sorun: ${ch}${code ? ` — ${code}` : ''}`,
      `Etkilenen: ${tenantList}`,
      `Tespit: ${new Date(group.items[0].fired_at).toLocaleString('tr-TR')}`,
      `Çözüm: ${this.solutionFor(ch, code)}`,
      `Detay: /admin > Esnaf Kanal Sağlığı`,
    ].join('\n');
    await this.dispatch(settings, body, `⚠️ Sistem geneli: ${group.items.length} esnafta arıza`);
  }

  private solutionFor(channel: string, code: string): string {
    if (code === 'TOKEN_EXPIRED' || code === 'expired') return "API anahtarını/token'ı yenileyin.";
    if (code === 'expiring_soon') return "Token'ı yenilemeyi planlayın (süresi yaklaşıyor).";
    if (channel === 'whatsapp') return 'WhatsApp bağlantısını / API anahtarını kontrol edin.';
    if (channel === 'phone' || channel === 'sms') return 'NetGSM / SMS bağlantısını kontrol edin.';
    if (channel === 'instagram') return "Instagram bağlantısını / token'ı kontrol edin.";
    if (channel === 'ai') return 'AI sağlayıcı durumunu kontrol edin.';
    return 'İlgili bağlantıyı kontrol edin.';
  }

  /** Kanallara dağıtır: e-posta (her zaman) + WhatsApp → yoksa SMS fallback */
  private async dispatch(settings: Record<string, any>, body: string, emailSubject: string) {
    if (settings.email_enabled && settings.owner_email) {
      await this.sendEmail(String(settings.owner_email), emailSubject, body);
    }

    const waEnabled = settings.whatsapp_enabled && settings.whatsapp_phone;
    const smsEnabled = settings.sms_enabled && settings.sms_phone;

    if (waEnabled) {
      const waOk = await this.sendWhatsApp(String(settings.whatsapp_phone), body);
      if (!waOk && smsEnabled) {
        await this.sendSms(String(settings.sms_phone), body);
      }
    } else if (smsEnabled) {
      await this.sendSms(String(settings.sms_phone), body);
    }
  }

  private async sendWhatsApp(to: string, body: string): Promise<boolean> {
    try {
      const res = await this.outbound.send({
        tenantId: '00000000-0000-0000-0000-000000000001',
        channel: 'whatsapp',
        to,
        body,
      });
      if (!res.success) {
        this.logger.warn(`Alert WhatsApp failed (${res.error}); SMS fallback`);
        return false;
      }
      this.logger.log(`Alert WhatsApp sent to ${to}`);
      return true;
    } catch (e) {
      this.logger.warn(`Alert WhatsApp error: ${(e as Error).message}`);
      return false;
    }
  }

  private async sendSms(to: string, body: string) {
    try {
      const res = await this.outbound.send({
        tenantId: '00000000-0000-0000-0000-000000000001',
        channel: 'sms',
        to,
        body,
      });
      this.logger.log(`Alert SMS ${res.success ? 'sent' : 'failed'} to ${to}`);
    } catch (e) {
      this.logger.warn(`Alert SMS error: ${(e as Error).message}`);
    }
  }

  private async sendEmail(to: string, subject: string, text: string) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn(`SMTP yapilandirilmadi. Arıza maili atlanıyor: ${subject}`);
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        text,
        html: `<pre style="font-family:sans-serif;font-size:13px;background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0">${text}</pre>`,
      });
      this.logger.log(`Alert email sent to ${to}`);
    } catch (e) {
      this.logger.warn(`Alert email error: ${(e as Error).message}`);
    }
  }
}
