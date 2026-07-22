import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);
  private cache: Map<string, Record<string, unknown>[]> = new Map();

  constructor(private readonly supabase: SupabaseService) {}

  async getActiveCampaigns(tenantId: string): Promise<Record<string, unknown>[]> {
    if (this.cache.has(tenantId)) return this.cache.get(tenantId) || [];

    const today = new Date().toISOString().split('T')[0];
    const { data } = await this.supabase.db
      .from('campaigns')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', { ascending: false });

    const result = data || [];
    this.cache.set(tenantId, result);
    return result;
  }

  async renderCampaignPrompt(tenantId: string): Promise<string> {
    const campaigns = await this.getActiveCampaigns(tenantId);
    if (!campaigns || campaigns.length === 0) return '';

    const lines = ['[AKTİF KAMPANYALAR]'];
    for (const c of campaigns) {
      lines.push(`- ${c['title']}: ${c['condition']} → ${c['offer']}`);
    }
    lines.push('KAMPANYA KURALI: Müşteri siparişini verdikten sonra, sipariş özetini okurken uygun kampanya varsa nazikçe belirt.');
    lines.push('Önce siparişi al, sonra kampanyayı öner. Asla müşteri daha siparişini söylemeden kampanya anlatma.');

    return lines.join('\n');
  }

  async updateCampaign(tenantId: string, id: string, data: Record<string, unknown>) {
    const { data: updated, error } = await this.supabase.db
      .from('campaigns')
      .update(data)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Campaign update failed: ${error.message}`);
    this.cache.delete(tenantId);
    return updated;
  }

  async create(tenantId: string, data: Record<string, unknown>) {
    const { data: created, error } = await this.supabase.db
      .from('campaigns')
      .insert({ ...data, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw new Error(`Campaign creation failed: ${error.message}`);
    this.cache.delete(tenantId);
    return created;
  }

  async list(tenantId: string) {
    const { data } = await this.supabase.db
      .from('campaigns')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    return data || [];
  }

  invalidateCache(tenantId: string) {
    this.cache.delete(tenantId);
  }
}
