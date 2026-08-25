import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Injectable()
export class WebhookDedupService {
  private readonly logger = new Logger(WebhookDedupService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Bir webhook event'ini idempotent şekilde işlenmek üzere kaydeder.
   *
   * Aynı (provider, provider_event_id) daha önce kaydedildiyse:
   *   - status 'duplicate' -> `true` (işlem tekrar edilmemeli)
   * Aksi halde 'processed' olarak kaydeder -> `false` (işleme devam)
   */
  async claim(tenantId: string, provider: string, providerEventId: string): Promise<boolean> {
    if (!providerEventId) return false; // ID yoksa idempotency uygulanamaz

    const { data, error } = await this.supabase.db
      .from('webhook_events')
      .upsert(
        { tenant_id: tenantId, provider, provider_event_id: providerEventId, status: 'processed' },
        { onConflict: 'provider,provider_event_id', ignoreDuplicates: true },
      )
      .select('id')
      .maybeSingle();

    if (error) {
      this.logger.error(`webhook dedup failed: ${error.message}`);
      return false;
    }

    // ignoreDuplicates: yeni kayıt insert edilirse data döner (non-null) -> duplicate değil.
    // Aynı (provider, event_id) zaten varsa insert yapılmaz, data null döner -> duplicate.
    return data == null;
  }
}
