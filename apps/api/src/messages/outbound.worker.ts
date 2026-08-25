import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../common/supabase.client';
import { OutboundChannelFactory } from './outbound.factory';
import { OutboundChannelName } from './outbound-channel.interface';
import { ChannelHealthService } from '../channel-health/channel-health.service';

/**
 * Outbound Worker — kuyruğa yazılan mesajları tüketip gerçek kanallara iletir.
 *
 * Kaynaklar:
 *   1) whatsapp_messages (direction=outgoing, status=queued/pending) → WhatsApp kanalı
 *   2) ai_events (event_type=whatsapp_group_sent, event_data.status=queued) → Grup kanalı
 *
 * Kanal yapılandırılmamışsa mesaj 'provider_not_configured' durumuna düşer ve
 * panele (throttle'lı) kurulum bildirimi gider.
 */
@Injectable()
export class OutboundWorker implements OnModuleInit {
  private readonly logger = new Logger(OutboundWorker.name);
  private notifiedAt = new Map<string, number>();

  constructor(
    private readonly factory: OutboundChannelFactory,
    private readonly supabase: SupabaseService,
    private readonly channelHealth: ChannelHealthService,
  ) {}

  onModuleInit() {
    this.logger.log('Outbound worker başlatıldı (15 sn aralık)');
  }

  @Cron('*/15 * * * * *')
  async processQueues() {
    await Promise.all([this.processWhatsappMessages(), this.processGroupEvents()]);
  }

  private async processWhatsappMessages(): Promise<void> {
    const { data } = await this.supabase.db
      .from('whatsapp_messages')
      .select('id, tenant_id, message, body, status, retry_count, conversation:conversation_id(phone)')
      .eq('direction', 'outgoing')
      .in('status', ['queued', 'pending'])
      .order('created_at', { ascending: true })
      .limit(20);

    if (!data?.length) return;

    for (const row of data as Record<string, any>[]) {
      const tenantId = row.tenant_id as string;
      const phone = (row.conversation as { phone?: string } | null)?.phone;

      // Optimistik kilit: hâlâ queued ise sending yap
      await this.supabase.db
        .from('whatsapp_messages')
        .update({ status: 'sending' })
        .eq('id', row.id)
        .in('status', ['queued', 'pending']);

      if (!phone) {
        await this.markWhatsappFailed(row.id, tenantId, 'Hedef telefon çözümlenemedi');
        continue;
      }

      const body = (row.body || row.message || '').trim();
      if (!body) {
        await this.markWhatsappFailed(row.id, tenantId, 'Mesaj içeriği boş');
        continue;
      }

      const channel = this.factory.getChannel('whatsapp');
      const configured = await channel.isConfigured(tenantId);

      if (!configured) {
        await this.supabase.db
          .from('whatsapp_messages')
          .update({ status: 'provider_not_configured', error_message: 'META_WHATSAPP_NOT_CONFIGURED' })
          .eq('id', row.id);
        await this.notifySetup(tenantId, 'whatsapp', 'WhatsApp gönderimi için Meta API anahtarı gerekli (api-keys → WhatsApp Cloud API)');
        continue;
      }

      const result = await channel.send({ tenantId, channel: 'whatsapp', to: phone, body });
      if (result.success) {
        await this.supabase.db
          .from('whatsapp_messages')
          .update({ status: 'sent', error_message: null, sent_at: new Date().toISOString() })
          .eq('id', row.id);
        await this.channelHealth.record(tenantId, 'whatsapp', true);
      } else {
        await this.channelHealth.record(tenantId, 'whatsapp', false, { error: result.error || undefined, errorCode: 'WA_SEND' });
        const retryCount = Number(row.retry_count || 0);
        if (retryCount < 3) {
          await this.supabase.db
            .from('whatsapp_messages')
            .update({ status: 'queued', retry_count: retryCount + 1, error_message: result.error || null })
            .eq('id', row.id);
        } else {
          await this.markWhatsappFailed(row.id, tenantId, result.error || 'Bilinmeyen hata');
        }
      }
    }
  }

  private async processGroupEvents(): Promise<void> {
    const { data } = await this.supabase.db
      .from('ai_events')
      .select('id, tenant_id, event_data')
      .eq('event_type', 'whatsapp_group_sent')
      .eq('event_data->>status', 'queued')
      .order('created_at', { ascending: true })
      .limit(20);

    if (!data?.length) return;

    for (const row of data as Record<string, any>[]) {
      const tenantId = row.tenant_id as string;
      const eventData = (row.event_data as Record<string, unknown>) || {};
      const message = String(eventData.message || '');

      await this.supabase.db
        .from('ai_events')
        .update({ event_data: { ...eventData, status: 'sending' } })
        .eq('id', row.id)
        .eq('event_data->>status', 'queued');

      if (!message.trim()) {
        await this.markGroupEventFailed(row.id, tenantId, eventData, 'Mesaj içeriği boş');
        continue;
      }

      const channel = this.factory.getChannel('whatsapp_group');
      const configured = await channel.isConfigured(tenantId);

      if (!configured) {
        await this.markGroupEventFailed(row.id, tenantId, eventData, 'WHATSAPP_GROUP_NOT_CONFIGURED');
        await this.notifySetup(tenantId, 'whatsapp_group', 'WhatsApp grubuna gönderim için grup ID tanımlanmalı (Ayarlar → WhatsApp Grubu)');
        continue;
      }

      const result = await channel.send({ tenantId, channel: 'whatsapp_group', body: message });
      if (result.success) {
        await this.supabase.db
          .from('ai_events')
          .update({ event_data: { ...eventData, status: 'sent', provider: result.provider } })
          .eq('id', row.id);
        await this.channelHealth.record(tenantId, 'whatsapp', true);
      } else {
        await this.channelHealth.record(tenantId, 'whatsapp', false, { error: result.error || undefined, errorCode: 'WA_GROUP_SEND' });
        await this.markGroupEventFailed(row.id, tenantId, eventData, result.error || 'Bilinmeyen hata');
        if (result.error?.startsWith('META_GROUP_UNSUPPORTED')) {
          await this.notifySetup(tenantId, 'whatsapp_group', result.error.replace('META_GROUP_UNSUPPORTED: ', ''));
        }
      }
    }
  }

  private async markWhatsappFailed(id: string, tenantId: string, error: string): Promise<void> {
    await this.supabase.db
      .from('whatsapp_messages')
      .update({ status: 'failed', error_message: error })
      .eq('id', id);
    this.logger.warn(`WhatsApp message ${id} failed (tenant ${tenantId}): ${error}`);
  }

  private async markGroupEventFailed(id: string, tenantId: string, eventData: Record<string, unknown>, error: string): Promise<void> {
    await this.supabase.db
      .from('ai_events')
      .update({ event_data: { ...eventData, status: 'failed', error_message: error } })
      .eq('id', id);
    this.logger.warn(`Group event ${id} failed (tenant ${tenantId}): ${error}`);
  }

  /** Aynı kanal için kurulum bildirimini en fazla 10 dakikada bir gönderir. */
  private async notifySetup(tenantId: string, channel: string, message: string): Promise<void> {
    const key = `${tenantId}:${channel}`;
    const last = this.notifiedAt.get(key) || 0;
    if (Date.now() - last < 10 * 60 * 1000) return;
    this.notifiedAt.set(key, Date.now());

    try {
      await this.supabase.db.from('notifications').insert({
        tenant_id: tenantId,
        type: 'warning',
        title: `⚠️ ${channel === 'whatsapp_group' ? 'WhatsApp Grubu' : channel === 'whatsapp' ? 'WhatsApp' : 'Kanal'} kurulumu gerekli`,
        message,
        status: 'unread',
      });
    } catch {}
  }
}
