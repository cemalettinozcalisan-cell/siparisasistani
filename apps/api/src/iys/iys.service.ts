import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { NetgsmIysProvider, IysConsent } from './providers/netgsm-iys.provider';

@Injectable()
export class IysService {
  private readonly logger = new Logger(IysService.name);

  constructor(
    private readonly provider: NetgsmIysProvider,
    private readonly supabase: SupabaseService,
  ) {}

  async isConfigured(tenantId: string): Promise<boolean> {
    return this.provider.isConfigured(tenantId);
  }

  /**
   * Pazarlama (kampanya) gönderimi öncesi izin kontrolü.
   * 1) Önce yerel opt_outs listesi (manuel / "DUR" yanıtı) kontrol edilir.
   * 2) Sonra NetGSM NetİYS sorgusu yapılır (yapılandırılmışsa).
   */
  async checkConsent(tenantId: string, phone: string): Promise<IysConsent> {
    const normalized = phone.trim();

    const { data: local } = await this.supabase.db
      .from('opt_outs')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('phone', normalized)
      .maybeSingle();

    if (local) return { phone: normalized, consent: 'ret' };

    return this.provider.checkConsent(tenantId, normalized);
  }

  async checkBatch(tenantId: string, phones: string[]): Promise<IysConsent[]> {
    const results: IysConsent[] = [];
    for (const phone of phones) {
      results.push(await this.checkConsent(tenantId, phone));
    }
    return results;
  }

  /** Pazarlama mesajı için gelen opt-out kaydı (manuel / yanıt bazlı). */
  async recordOptOut(tenantId: string, phone: string, channel = 'sms', source = 'manual'): Promise<void> {
    try {
      await this.supabase.db.from('opt_outs').upsert({
        tenant_id: tenantId,
        phone: phone.trim(),
        channel,
        source,
      }, { onConflict: 'tenant_id,phone,channel' });
    } catch (err) {
      this.logger.error(`opt_outs kaydı başarısız: ${(err as Error).message}`);
    }
  }

  /** Pazarlama gönderimi öncesi kuyruğu İYS'ye göre filtreler. */
  async filterMarketingAllowed(tenantId: string, phones: string[]): Promise<string[]> {
    const allowed: string[] = [];
    for (const phone of phones) {
      const result = await this.checkConsent(tenantId, phone);
      if (result.consent !== 'ret') allowed.push(phone);
    }
    return allowed;
  }
}
