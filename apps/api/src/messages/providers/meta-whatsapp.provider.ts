import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../common/supabase.client';
import { OutboundChannel, OutboundMessage, OutboundSendResult, OutboundHealth } from '../outbound-channel.interface';

interface MetaWhatsappCredentials {
  token: string;
  phoneNumberId: string;
  wabaId?: string;
}

/**
 * Meta WhatsApp Cloud API — kimlik bilgileri api_keys (meta_whatsapp) tablosundan okunur.
 * Anahtar girilene kadar pasif (dormant); isConfigured false döner ve mesaj kuyrukta kalır.
 */
@Injectable()
export class MetaWhatsappProvider implements OutboundChannel {
  readonly name = 'whatsapp' as const;
  private readonly logger = new Logger(MetaWhatsappProvider.name);
  private readonly graphUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    this.graphUrl = this.config.get<string>('WHATSAPP_GRAPH_URL', 'https://graph.facebook.com/v19.0');
  }

  async getCredentials(tenantId: string): Promise<MetaWhatsappCredentials | null> {
    const { data } = await this.supabase.db
      .from('api_keys')
      .select('api_key, api_secret, extra_config')
      .eq('tenant_id', tenantId)
      .eq('provider', 'meta_whatsapp')
      .maybeSingle();

    if (!data?.api_key || !data?.api_secret) return null;
    const extra = (data.extra_config as Record<string, unknown>) || {};
    return {
      token: data.api_key as string,
      phoneNumberId: data.api_secret as string,
      wabaId: extra.waba_id as string | undefined,
    };
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    return Boolean(await this.getCredentials(tenantId));
  }

  async send(message: OutboundMessage): Promise<OutboundSendResult> {
    const creds = await this.getCredentials(message.tenantId);
    if (!creds) {
      return { success: false, error: 'META_WHATSAPP_NOT_CONFIGURED' };
    }
    if (!message.to) return { success: false, error: 'WhatsApp hedef telefon yok' };

    let payload: Record<string, unknown>;
    if (message.templateId) {
      // Onaylı pazarlama şablonu + dinamik değişkenler
      const parameters = Object.entries(message.variables || {})
        .map(([text]) => ({ type: 'text', text }));
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.to,
        type: 'template',
        template: {
          name: message.templateId,
          language: { code: 'tr' },
          components: parameters.length ? [{ type: 'body', parameters }] : [],
        },
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.to,
        type: 'text',
        text: { preview_url: false, body: message.body },
      };
    }

    try {
      const response = await fetch(`${this.graphUrl}/${creds.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = (await response.json().catch(() => ({}))) as { messages?: { id?: string }[]; error?: { message?: string } };
      if (!response.ok) {
        this.logger.warn(`Meta WhatsApp send failed: ${json.error?.message || response.statusText}`);
        return { success: false, provider: 'meta_whatsapp', error: json.error?.message || `HTTP ${response.status}` };
      }

      return { success: true, provider: 'meta_whatsapp', providerMessageId: json.messages?.[0]?.id };
    } catch (err) {
      this.logger.error(`Meta WhatsApp send error: ${(err as Error).message}`);
      return { success: false, provider: 'meta_whatsapp', error: (err as Error).message };
    }
  }

  async healthCheck(tenantId?: string): Promise<OutboundHealth> {
    if (!tenantId) return { healthy: false, configured: false, message: 'tenantId gerekli' };
    const creds = await this.getCredentials(tenantId);
    if (!creds) {
      return { healthy: false, configured: false, message: 'Meta WhatsApp API anahtarı tanımlı değil (api-keys → WhatsApp Cloud API)' };
    }
    // Hafif doğrulama: WABA bilgisi mevcutsa tamam say
    return { healthy: Boolean(creds.phoneNumberId), configured: true, message: 'OK' };
  }
}
