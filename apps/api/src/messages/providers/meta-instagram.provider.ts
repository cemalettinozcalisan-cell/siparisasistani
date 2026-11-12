import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../common/supabase.client';
import { OutboundChannel, OutboundMessage, OutboundSendResult, OutboundHealth } from '../outbound-channel.interface';

interface MetaInstagramCredentials {
  token: string;
  igId: string;
}

/**
 * Meta Instagram DM — kimlik bilgileri api_keys (meta_instagram) tablosundan okunur.
 * Anahtar girilene kadar pasif (dormant).
 */
@Injectable()
export class MetaInstagramProvider implements OutboundChannel {
  readonly name = 'instagram' as const;
  private readonly logger = new Logger(MetaInstagramProvider.name);
  private readonly graphUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    this.graphUrl = this.config.get<string>('INSTAGRAM_GRAPH_URL', 'https://graph.instagram.com/v23.0').replace(/\/+$/, '');
  }

  async getCredentials(tenantId: string): Promise<MetaInstagramCredentials | null> {
    const { data } = await this.supabase.db
      .from('api_keys')
      .select('api_key, api_secret, extra_config')
      .eq('tenant_id', tenantId)
      .eq('provider', 'meta_instagram')
      .maybeSingle();

    if (!data?.api_key) return null;
    const extra = (data.extra_config as Record<string, unknown> | null) || {};
    const igId = String(extra.ig_id || data.api_secret || '').trim();
    return { token: data.api_key as string, igId };
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    return Boolean(await this.getCredentials(tenantId));
  }

  async send(message: OutboundMessage): Promise<OutboundSendResult> {
    const creds = await this.getCredentials(message.tenantId);
    if (!creds) {
      return { success: false, error: 'META_INSTAGRAM_NOT_CONFIGURED' };
    }
    if (!message.to) return { success: false, error: 'Instagram hedef yok' };

    try {
      // Instagram API with Instagram Login: graph.instagram.com, IG user token, /<IG_ID>/messages.
      const endpoint = creds.igId ? `${this.graphUrl}/${creds.igId}/messages` : `${this.graphUrl}/me/messages`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: message.to },
          message: { text: message.body },
        }),
      });

      const json = (await response.json().catch(() => ({}))) as {
        recipient_id?: string;
        message_id?: string;
        error?: { message?: string };
      };
      if (!response.ok) {
        this.logger.warn(`Meta Instagram send failed: ${json.error?.message || response.statusText}`);
        return { success: false, provider: 'meta_instagram', error: json.error?.message || `HTTP ${response.status}` };
      }

      return { success: true, provider: 'meta_instagram', providerMessageId: json.message_id };
    } catch (err) {
      this.logger.error(`Meta Instagram send error: ${(err as Error).message}`);
      return { success: false, provider: 'meta_instagram', error: (err as Error).message };
    }
  }

  async healthCheck(tenantId?: string): Promise<OutboundHealth> {
    if (!tenantId) return { healthy: false, configured: false, message: 'tenantId gerekli' };
    const creds = await this.getCredentials(tenantId);
    if (!creds) {
      return { healthy: false, configured: false, message: 'Instagram API anahtarı tanımlı değil (api-keys → Instagram DM)' };
    }
    return { healthy: true, configured: true, message: 'OK' };
  }
}
