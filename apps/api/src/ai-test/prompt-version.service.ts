import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

export type PromptStatus = 'draft' | 'testing' | 'approved' | 'active';

@Injectable()
export class PromptVersionService {
  private readonly logger = new Logger(PromptVersionService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /** Bir prompt'u DRAFT olarak yeni sürüm hâlinde kaydeder. Eski sürümler korunur. */
  async saveDraft(tenantId: string, channel: string, state: string, prompt: string) {
    const { data: latest } = await this.supabase.db
      .from('prompt_versions')
      .select('version, status')
      .eq('tenant_id', tenantId)
      .eq('channel', channel)
      .eq('state', state)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (Number(latest?.version) || 0) + 1;
    const { data, error } = await this.supabase.db
      .from('prompt_versions')
      .insert({
        tenant_id: tenantId, channel, state, version: nextVersion, prompt, status: 'draft',
      })
      .select('*')
      .single();

    if (error) this.logger.error(`prompt draft save failed: ${error.message}`);
    return data;
  }

  /** Onay öncesi otomatik senaryo testini simüle eder ve sürümü 'approved' yapar. */
  async approve(tenantId: string, channel: string, state: string, version: number) {
    // Basit otomatik sağlık kontrolü: kritik yapı bileşenleri eksikse onaya izin verme
    const { data: row } = await this.supabase.db
      .from('prompt_versions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('channel', channel)
      .eq('state', state)
      .eq('version', version)
      .maybeSingle();
    if (!row) return null;

    const prompt = String(row.prompt || '');
    const issues: string[] = [];
    if (!/{{products_list}}/.test(prompt)) issues.push('Ürün kataloğu değişkeni eksik');
    if (!/{{payment_methods}}/.test(prompt) && channel === 'phone') issues.push('Ödeme yöntemleri değişkeni eksik');
    if (prompt.trim().length < 50) issues.push('Prompt çok kısa');

    // Sürümü 'active' yap; diğer sürümleri deactive et (tek aktif)
    if (issues.length === 0) {
      await this.supabase.db
        .from('prompt_versions')
        .update({ status: 'approved' })
        .eq('tenant_id', tenantId).eq('channel', channel).eq('state', state).eq('version', version);

      await this.supabase.db
        .from('prompt_versions')
        .update({ status: 'approved' })
        .eq('tenant_id', tenantId).eq('channel', channel).eq('state', state).neq('version', version)
        .in('status', ['active', 'approved']);
    }

    return { ...row, issues };
  }

  /** Onaylanmış bir sürümü aktif yapar (değişiklik insan onayından geçmiş demektir). */
  async activate(tenantId: string, channel: string, state: string, version: number) {
    // Aktif olanı deactive et
    await this.supabase.db
      .from('prompt_versions')
      .update({ status: 'approved' })
      .eq('tenant_id', tenantId).eq('channel', channel).eq('state', state).eq('status', 'active');

    const { data, error } = await this.supabase.db
      .from('prompt_versions')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId).eq('channel', channel).eq('state', state).eq('version', version)
      .select('*')
      .single();

    if (error) this.logger.error(`prompt activate failed: ${error.message}`);

    // Aktif prompt'u tenant_settings.custom_prompts'e de yaz (runtime okur)
    if (data) {
      const { data: settings } = await this.supabase.db
        .from('tenant_settings')
        .select('custom_prompts')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      const customPrompts = (settings as any)?.custom_prompts || {};
      const key = `${channel}_${state}`;
      customPrompts[key] = data.prompt;
      await this.supabase.db.from('tenant_settings').update({ custom_prompts: customPrompts } as any).eq('tenant_id', tenantId);
    }

    return data;
  }

  /** Sürüm geçmişini listeler (TÜM sürümler, aktif dahil). */
  async history(tenantId: string, channel: string, state: string) {
    const { data } = await this.supabase.db
      .from('prompt_versions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('channel', channel)
      .eq('state', state)
      .order('version', { ascending: false })
      .limit(20);
    return data || [];
  }
}
