import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async list(tenantId: string) {
    const { data } = await this.supabase.db
      .from('api_keys')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('provider');
    return data || [];
  }

  async upsert(tenantId: string, provider: string, body: { label?: string; api_key?: string; api_secret?: string; extra_config?: Record<string, unknown> }) {
    const { data, error } = await this.supabase.db
      .from('api_keys')
      .upsert({
        tenant_id: tenantId,
        provider,
        label: body.label || provider,
        api_key: body.api_key || null,
        api_secret: body.api_secret || null,
        extra_config: body.extra_config || {},
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,provider' })
      .select()
      .single();

    if (error) throw new Error(`API key upsert failed: ${error.message}`);
    return data;
  }

  async test(tenantId: string, provider: string) {
    const { data } = await this.supabase.db
      .from('api_keys')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', provider)
      .single();

    if (!data) return { status: 'not_configured' };

    let status = 'unknown';
    try {
      switch (provider) {
        case 'deepseek':
        case 'openai':
        case 'anthropic':
        case 'bilge_ai':
        case 'azure_speech':
          status = (data as any).api_key ? 'configured' : 'missing_key';
          break;
        case 'netgsm':
        case 'twilio':
        case 'iys':
          status = (data as any).api_key && (data as any).api_secret ? 'configured' : 'missing_credentials';
          break;
        case 'openai_tts': {
          const { data: openaiRow } = await this.supabase.db
            .from('api_keys')
            .select('api_key')
            .eq('tenant_id', tenantId)
            .eq('provider', 'openai')
            .single();
          status = openaiRow?.api_key ? 'configured' : 'missing_key';
          break;
        }
        default:
          status = (data as any).api_key ? 'configured' : 'missing_key';
      }
    } catch { status = 'error'; }

    await this.supabase.db
      .from('api_keys')
      .update({ last_tested_at: new Date().toISOString() })
      .eq('id', (data as any).id);

    return { status, provider };
  }

  async remove(tenantId: string, provider: string) {
    await this.supabase.db
      .from('api_keys')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('provider', provider);
    return { success: true };
  }
}
