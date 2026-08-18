import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.client';

export interface IysConsent {
  phone: string;
  /** approved = izinli, ret = ret vermiş, unknown = NetGSM/İYS sorgusu yapılamadı */
  consent: 'approved' | 'ret' | 'unknown';
}

interface IysCredentials {
  username: string;
  password: string;
  iysCode?: string;
  brandCode?: string;
}

/**
 * NetGSM NetİYS entegrasyonu (6563 sayılı kanun / İYS uyumu).
 *
 * Durum: api_keys içinde 'iys' provider'ı tanımlı değilse SORGULAMA YAPILMAZ ve
 * 'unknown' döner (gönderim engellenmez). Esnaf NetGSM hesabını aldığında
 * api_keys'e İYS kullanıcı/şifre girmesi yeterli; gerçek sorgu burada yürür.
 */
@Injectable()
export class NetgsmIysProvider {
  private readonly logger = new Logger(NetgsmIysProvider.name);
  private readonly apiUrl = 'https://api.netgsm.com.tr/iys';

  constructor(private readonly supabase: SupabaseService) {}

  async getCredentials(tenantId: string): Promise<IysCredentials | null> {
    const { data } = await this.supabase.db
      .from('api_keys')
      .select('api_key, api_secret, extra_config')
      .eq('tenant_id', tenantId)
      .eq('provider', 'iys')
      .maybeSingle();

    if (!data?.api_key) return null;
    const extra = (data.extra_config as Record<string, unknown>) || {};
    return {
      username: data.api_key as string,
      password: (data.api_secret as string) || '',
      iysCode: extra.iys_code as string | undefined,
      brandCode: extra.brand_code as string | undefined,
    };
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    return Boolean(await this.getCredentials(tenantId));
  }

  /**
   * Tek numaranın İYS izin durumunu sorgular.
   * NetGSM NetİYS API'si (dormant): kimlik bilgisi gelince gerçek uç çağrılır.
   */
  async checkConsent(tenantId: string, phone: string): Promise<IysConsent> {
    const creds = await this.getCredentials(tenantId);
    if (!creds) {
      return { phone, consent: 'unknown' };
    }

    try {
      const params = new URLSearchParams({
        username: creds.username,
        password: creds.password,
        gsmno: phone.replace(/\D/g, ''),
        type: 'B2C',
      });
      if (creds.iysCode) params.set('iys_code', creds.iysCode);
      if (creds.brandCode) params.set('brand_code', creds.brandCode);

      const response = await fetch(`${this.apiUrl}/sorgula`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const text = await response.text();
      // NetGSM İYS: "1" = izinli, "2" = ret, diğer = bilinmiyor
      const code = text.trim();
      if (code === '1') return { phone, consent: 'approved' };
      if (code === '2') return { phone, consent: 'ret' };
      this.logger.warn(`NetGSM İYS beklenmeyen yanıt: ${text}`);
      return { phone, consent: 'unknown' };
    } catch (err) {
      this.logger.error(`NetGSM İYS sorgusu başarısız: ${(err as Error).message}`);
      return { phone, consent: 'unknown' };
    }
  }
}
