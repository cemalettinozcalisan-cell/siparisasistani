import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../common/supabase.client';

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: { message?: string };
}

/**
 * Her tenant'ın kendi Instagram User access token'ını süresi dolmadan yeniler.
 * Instagram Login token'ları ~60 gün geçerlidir; refresh_access_token ile uzatılır.
 */
@Injectable()
export class InstagramTokenRefreshService {
  private readonly logger = new Logger(InstagramTokenRefreshService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {}

  @Cron('0 3 * * *')
  async refreshTokens(): Promise<void> {
    const { data, error } = await this.supabase.db
      .from('api_keys')
      .select('tenant_id, api_key, extra_config')
      .eq('provider', 'meta_instagram');
    if (error) {
      this.logger.warn(`Instagram token refresh query failed: ${error.message}`);
      return;
    }

    const refreshUrl = this.config.get<string>(
      'INSTAGRAM_TOKEN_REFRESH_URL',
      'https://graph.instagram.com/refresh_access_token',
    );
    const fifteenDays = 15 * 24 * 60 * 60 * 1000;

    for (const row of data || []) {
      const tenantId = String(row.tenant_id || '');
      const token = String(row.api_key || '');
      const extra = (row.extra_config as Record<string, unknown> | null) || {};
      if (!tenantId || !token) continue;

      const expiresAt = extra.expires_at ? new Date(String(extra.expires_at)).getTime() : 0;
      if (expiresAt && expiresAt - Date.now() > fifteenDays) continue;

      try {
        const url = `${refreshUrl}?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`;
        const response = await fetch(url);
        const json = (await response.json().catch(() => ({}))) as TokenResponse;
        if (!response.ok || !json.access_token) {
          this.logger.warn(
            `Instagram token refresh failed for tenant ${tenantId}: ${json.error?.message || response.statusText}`,
          );
          continue;
        }

        const expiresIn = Number(json.expires_in || 0);
        const newExpiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
        await this.supabase.db
          .from('api_keys')
          .update({
            api_key: json.access_token,
            extra_config: { ...extra, expires_at: newExpiresAt },
          })
          .eq('tenant_id', tenantId)
          .eq('provider', 'meta_instagram');

        this.logger.log(`Instagram token refreshed for tenant ${tenantId}`);
      } catch (e) {
        this.logger.warn(`Instagram token refresh error for tenant ${tenantId}: ${(e as Error).message}`);
      }
    }
  }
}
