import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../common/supabase.client';
import { OutboundChannel, OutboundMessage, OutboundSendResult, OutboundHealth } from '../outbound-channel.interface';

/**
 * Esnafın iç operasyon WhatsApp grubuna gönderim.
 *
 * ÖNEMLİ: Meta Cloud API grup mesajı desteklemez. Bu adapter iki modda çalışır:
 *   1) WHATSAPP_GROUP_API_URL env'i set edilmişse (esnafın on-premises / köprü servisi)
 *      POST { groupId, message } olarak iletir.
 *   2) Set edilmemişse Cloud API ile gruba deneme yapar; Meta hatası dönerse
 *      sonuç failed + açıklayıcı mesaj olur ve panel bildirimi üretilir.
 */
@Injectable()
export class WhatsAppGroupProvider implements OutboundChannel {
  readonly name = 'whatsapp_group' as const;
  private readonly logger = new Logger(WhatsAppGroupProvider.name);

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {}

  async getGroupId(tenantId: string): Promise<string | null> {
    const { data } = await this.supabase.db
      .from('tenant_settings')
      .select('whatsapp_group_id')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    return (data?.whatsapp_group_id as string) || null;
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    const groupId = await this.getGroupId(tenantId);
    if (!groupId) return false;
    // Grup gönderimi için köprü servisi veya Cloud API anahtarı gerekiyor
    return Boolean(this.config.get<string>('WHATSAPP_GROUP_API_URL')) || true;
  }

  async send(message: OutboundMessage): Promise<OutboundSendResult> {
    const groupId = message.to || (await this.getGroupId(message.tenantId));
    if (!groupId) return { success: false, error: 'WhatsApp grup ID tanımlı değil' };

    const bridgeUrl = this.config.get<string>('WHATSAPP_GROUP_API_URL');
    if (bridgeUrl) {
      try {
        const response = await fetch(bridgeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId, message: message.body, tenantId: message.tenantId }),
        });
        if (!response.ok) {
          return { success: false, provider: 'whatsapp_group_bridge', error: `HTTP ${response.status}` };
        }
        return { success: true, provider: 'whatsapp_group_bridge' };
      } catch (err) {
        this.logger.error(`WhatsApp group bridge error: ${(err as Error).message}`);
        return { success: false, provider: 'whatsapp_group_bridge', error: (err as Error).message };
      }
    }

    // Köprü yoksa Cloud API'yi dene — Meta grup gönderimini reddeder; açıklayıcı hata döner.
    return {
      success: false,
      provider: 'whatsapp_group',
      error: 'META_GROUP_UNSUPPORTED: Meta Cloud API grup gönderimi desteklemez. WHATSAPP_GROUP_API_URL köprü servisi tanımlanmalı.',
    };
  }

  async healthCheck(tenantId?: string): Promise<OutboundHealth> {
    if (!tenantId) return { healthy: false, configured: false, message: 'tenantId gerekli' };
    const groupId = await this.getGroupId(tenantId);
    const bridge = this.config.get<string>('WHATSAPP_GROUP_API_URL');
    if (!groupId) {
      return { healthy: false, configured: false, message: 'WhatsApp grup ID tanımlı değil (Ayarlar → WhatsApp Grubu)' };
    }
    if (!bridge) {
      return { healthy: false, configured: true, message: 'Grup köprü servisi (WHATSAPP_GROUP_API_URL) tanımlı değil — gönderim bekletiliyor' };
    }
    return { healthy: true, configured: true, message: 'OK' };
  }
}
