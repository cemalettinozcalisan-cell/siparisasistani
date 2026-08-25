import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../common/supabase.client';

export type HealthChannel = 'phone' | 'sms' | 'whatsapp' | 'instagram' | 'website' | 'ai' | 'webhook';

@Injectable()
export class ChannelHealthService {
  private readonly logger = new Logger(ChannelHealthService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Bir kanal işleminin sonucunu kaydeder.
   * Her başarılı/hatalı dış sağlayıcı isteği buradan geçer.
   */
  async record(
    tenantId: string,
    channel: HealthChannel,
    ok: boolean,
    opts: { error?: string; errorCode?: string } = {},
  ) {
    if (!tenantId) return;

    // Denetim olayı
    await this.supabase.db.from('channel_health_events').insert({
      tenant_id: tenantId,
      channel,
      ok,
      error: ok ? null : opts.error || null,
      error_code: ok ? null : opts.errorCode || null,
    });

    // Özet satırı upsert
    const now = new Date().toISOString();
    const { data: existing } = await this.supabase.db
      .from('channel_health')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('channel', channel)
      .maybeSingle();

    const errorCount = existing ? (ok ? 0 : (existing.error_count || 0) + 1) : ok ? 0 : 1;

    if (existing) {
      await this.supabase.db
        .from('channel_health')
        .update({
          status: ok ? 'ok' : errorCount >= 3 ? 'degraded' : existing.status || 'unknown',
          last_success_at: ok ? now : existing.last_success_at,
          last_error_at: ok ? existing.last_error_at : now,
          last_error: ok ? existing.last_error : opts.error || null,
          last_error_code: ok ? existing.last_error_code : opts.errorCode || null,
          error_count: errorCount,
          error_count_1h: ok ? existing.error_count_1h || 0 : (existing.error_count_1h || 0) + 1,
          success_count_1h: ok ? (existing.success_count_1h || 0) + 1 : existing.success_count_1h || 0,
          last_success_1h_at: ok ? now : existing.last_success_1h_at,
          last_error_1h_at: ok ? existing.last_error_1h_at : now,
          updated_at: now,
        })
        .eq('id', existing.id);
    } else {
      await this.supabase.db.from('channel_health').insert({
        tenant_id: tenantId,
        channel,
        status: ok ? 'ok' : 'unknown',
        last_success_at: ok ? now : null,
        last_error_at: ok ? null : now,
        last_error: ok ? null : opts.error || null,
        last_error_code: ok ? null : opts.errorCode || null,
        error_count: errorCount,
        error_count_1h: ok ? 0 : 1,
        success_count_1h: ok ? 1 : 0,
        last_success_1h_at: ok ? now : null,
        last_error_1h_at: ok ? null : now,
      });
    }

    // Eşik aşıldıysa uyarı üret (3+ hata, tekrar tetiklenmeyi engelle)
    if (!ok && errorCount >= 3) {
      await this.raiseAlert(tenantId, channel, opts);
    }
  }

  /**
   * Eşik aşıldığında uyarı kaydı oluşturur (zaten açık benzer uyarı yoksa).
   */
  private async raiseAlert(
    tenantId: string,
    channel: HealthChannel,
    opts: { error?: string; errorCode?: string },
  ) {
    const { data: open } = await this.supabase.db
      .from('channel_health_alerts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('channel', channel)
      .is('resolved_at', null)
      .maybeSingle();

    if (open) return; // aynı kanal için açık uyarı zaten var

    await this.supabase.db.from('channel_health_alerts').insert({
      tenant_id: tenantId,
      channel,
      alert_type: 'degraded',
      message: `${channel} kanalında sorun tespit edildi. Son hata: ${opts.error || 'bilinmiyor'} (${opts.errorCode || '?'})`,
    });

    // Admin panele bildirim
    await this.supabase.db.from('notifications').insert({
      tenant_id: tenantId,
      type: 'channel_health',
      title: `⚠️ ${channel} kanalında sorun`,
      message: `Son hata: ${opts.error || 'bilinmiyor'} (${opts.errorCode || '?'})`,
      status: 'unread',
    });
  }

  /**
   * Per-tenant kanal sağlık özeti (1B ekranı için).
   */
  async getTenantHealth(tenantId: string): Promise<Record<string, unknown>> {
    const { data: rows } = await this.supabase.db
      .from('channel_health')
      .select('*')
      .eq('tenant_id', tenantId);

    const { data: events } = await this.supabase.db
      .from('channel_health_events')
      .select('channel, ok, error, error_code, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', new Date(Date.now() - 3600 * 1000).toISOString());

    const lastHour = events || [];

    const channels: Record<string, unknown> = {};
    const order: HealthChannel[] = ['phone', 'whatsapp', 'instagram', 'sms', 'website', 'ai', 'webhook'];
    for (const ch of order) {
      const row = (rows || []).find((r) => r.channel === ch);
      const chEvents = lastHour.filter((e) => e.channel === ch);
      channels[ch] = {
        status: row?.status || 'unknown',
        last_success_at: row?.last_success_at || null,
        last_error_at: row?.last_error_at || null,
        last_error: row?.last_error || null,
        last_error_code: row?.last_error_code || null,
        error_count: row?.error_count || 0,
        last_1h: {
          ok: chEvents.filter((e) => e.ok).length,
          fail: chEvents.filter((e) => !e.ok).length,
          errors: chEvents.filter((e) => !e.ok).map((e) => ({ error: e.error, code: e.error_code, at: e.created_at })),
        },
      };
    }

    const { data: alerts } = await this.supabase.db
      .from('channel_health_alerts')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('resolved_at', null)
      .order('fired_at', { ascending: false });

    return { channels, open_alerts: alerts || [] };
  }

  /**
   * API anahtarı ömür izleme (3C): 7 gün içinde sona erecek anahtarları 🟡,
   * süresi geçmişleri 🔴 uyarır. Instagram/WhatsApp token'ları için.
   */
  async scanTokenExpiry() {
    const now = new Date();
    const { data: keys } = await this.supabase.db
      .from('api_keys')
      .select('id, tenant_id, provider, label, active, expires_at, expires_at_known')
      .eq('active', true);

    for (const key of keys || []) {
      if (!key.expires_at || !key.expires_at_known) continue;
      const expiry = new Date(key.expires_at);
      const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) {
        // Süresi geçmiş -> kanalı down işaretle + uyarı
        await this.supabase.db
          .from('channel_health')
          .upsert(
            {
              tenant_id: key.tenant_id, channel: this.keyToChannel(key.provider),
              status: 'down', last_error: `API anahtarı süresi doldu (${key.label})`,
              last_error_code: 'TOKEN_EXPIRED', last_error_at: now.toISOString(),
              updated_at: now.toISOString(),
            },
            { onConflict: 'tenant_id,channel' },
          );
        await this.raiseTokenAlert(key.tenant_id, this.keyToChannel(key.provider), 'expired', key.label, daysLeft);
      } else if (daysLeft <= 7) {
        await this.raiseTokenAlert(key.tenant_id, this.keyToChannel(key.provider), 'expiring_soon', key.label, daysLeft);
      }
    }
  }

  private keyToChannel(provider: string): HealthChannel {
    if (provider.includes('instagram')) return 'instagram';
    if (provider.includes('whatsapp')) return 'whatsapp';
    if (provider.includes('netgsm')) return 'phone';
    return 'webhook';
  }

  private async raiseTokenAlert(tenantId: string, channel: HealthChannel, kind: 'expired' | 'expiring_soon', label: string, daysLeft: number) {
    const existing = await this.supabase.db
      .from('channel_health_alerts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('channel', channel)
      .eq('alert_type', kind)
      .is('resolved_at', null)
      .maybeSingle();
    if (existing.data) return;

    const message = kind === 'expired'
      ? `${label} API anahtarının süresi doldu. Bağlantı yenilenmeli.`
      : `${label} API anahtarı ${daysLeft} gün içinde sona erecek. Yenilenmeli.`;
    await this.supabase.db.from('channel_health_alerts').insert({
      tenant_id: tenantId, channel, alert_type: kind, message,
    });
    await this.supabase.db.from('notifications').insert({
      tenant_id: tenantId, type: 'token_expiry',
      title: kind === 'expired' ? `🔴 ${label} anahtarı süresi doldu` : `🟡 ${label} anahtarı ${daysLeft} gün içinde sona erecek`,
      message, status: 'unread',
    });
  }

  /**
   * Periyodik eşik izleyici: 15 dk'dır başarı olmayan ok kanalları "degraded" işaretler
   * ve açık uyarı bırakmayanları bildirir. (ScheduleModule ile her 5 dakikada bir.)
   */
  @Cron('*/30 * * * *')
  async scanTokenExpiryCron() {
    await this.scanTokenExpiry();
  }

  @Cron('*/5 * * * *')
  async scanStaleChannels() {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: stale } = await this.supabase.db
      .from('channel_health')
      .select('*')
      .eq('status', 'ok')
      .lt('last_success_at', cutoff);

    for (const row of stale || []) {
      await this.supabase.db
        .from('channel_health')
        .update({ status: 'degraded', updated_at: new Date().toISOString() })
        .eq('id', row.id);
      await this.raiseAlert(row.tenant_id, row.channel, { error: 'Son başarılı işlemden uzun süre geçti' });
    }
  }
}
