import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
};
const DEFAULT_COST = { input: 0.15, output: 0.60 };
function modelCost(model: string, promptTokens: number, completionTokens: number): number {
  const rate = MODEL_COSTS[model] || DEFAULT_COST;
  return (promptTokens * rate.input + completionTokens * rate.output) / 1_000_000;
}

@UseGuards(TenantGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly supabase: SupabaseService) {}

  @Roles('owner')
  @Get('stats')
  async getStats() {
    const [tenants, orders, customers, payments, users, conversations] = await Promise.all([
      this.supabase.db.from('tenants').select('id', { count: 'exact', head: true }),
      this.supabase.db.from('orders').select('total_price', { count: 'exact', head: true }),
      this.supabase.db.from('customers').select('id', { count: 'exact', head: true }),
      this.supabase.db.from('payments').select('amount').eq('status', 'paid'),
      this.supabase.db.from('users').select('id', { count: 'exact', head: true }),
      this.supabase.db.from('ai_audit_logs').select('id', { count: 'exact', head: true }),
    ]);

    const totalRevenue = (payments.data || []).reduce((s: number, p: Record<string, unknown>) => s + Number(p.amount || 0), 0);

    return {
      tenants: tenants.count || 0,
      orders: orders.count || 0,
      customers: customers.count || 0,
      revenue: totalRevenue,
      users: users.count || 0,
      aiConversations: conversations.count || 0,
      timestamp: new Date().toISOString(),
    };
  }

  @Roles('owner')
  @Get('tenants')
  async listTenants() {
    const { data } = await this.supabase.db
      .from('tenants')
      .select('id, company_name, domain, phone, email, city, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    return data || [];
  }

  @Roles('owner')
  @Put('tenants/:id')
  async updateTenant(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const { data, error } = await this.supabase.db
      .from('tenants')
      .update(body)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  /** Tüm tenant'ların kanal sağlık özeti — admin "Sistem Durumu → Esnaf Sağlık" tablosu */
  @Roles('owner')
  @Get('tenants/health')
  async listTenantHealth() {
    const [tenants, health] = await Promise.all([
      this.supabase.db
        .from('tenants')
        .select('id, company_name, domain, phone, status')
        .order('created_at', { ascending: false })
        .limit(100),
      this.supabase.db
        .from('channel_health')
        .select('tenant_id, channel, status, last_success_at, last_error_at, last_error, last_error_code, error_count, success_count_1h, error_count_1h, last_success_1h_at, last_error_1h_at'),
    ]);

    const byTenant: Record<string, Record<string, any>> = {};
    for (const row of health.data || []) {
      const tid = row.tenant_id as string;
      if (!byTenant[tid]) byTenant[tid] = {};
      byTenant[tid][row.channel as string] = row;
    }

    return (tenants.data || []).map((t) => ({
      tenant_id: t.id,
      company_name: t.company_name || 'İsimsiz',
      domain: t.domain || null,
      phone: t.phone || null,
      status: t.status || 'active',
      channels: {
        phone: byTenant[t.id]?.phone?.status || 'unknown',
        whatsapp: byTenant[t.id]?.whatsapp?.status || 'unknown',
        instagram: byTenant[t.id]?.instagram?.status || 'unknown',
        sms: byTenant[t.id]?.sms?.status || 'unknown',
        website: byTenant[t.id]?.website?.status || 'unknown',
        ai: byTenant[t.id]?.ai?.status || 'unknown',
      },
      detail: byTenant[t.id] || {},
    }));
  }

  /** Per-tenant AI maliyet & katkı özeti (3E) — hangi esnaf kâr ettiriyor */
  @Roles('owner')
  @Get('costs')
  async listCosts() {
    const [tenants, audits, subscriptions] = await Promise.all([
      this.supabase.db
        .from('tenants')
        .select('id, company_name, phone, status')
        .order('created_at', { ascending: false })
        .limit(100),
      this.supabase.db
        .from('ai_audit_logs')
        .select('tenant_id, model, token_prompt, token_completion, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      this.supabase.db
        .from('subscriptions')
        .select('tenant_id, plan_name, monthly_price, order_limit'),
    ]);

    const byTenant: Record<string, { cost: number; calls: number; tokens: number }> = {};
    for (const a of audits.data || []) {
      const tid = a.tenant_id as string;
      const cost = modelCost(String(a.model || ''), Number(a.token_prompt || 0), Number(a.token_completion || 0));
      if (!byTenant[tid]) byTenant[tid] = { cost: 0, calls: 0, tokens: 0 };
      byTenant[tid].cost += cost;
      byTenant[tid].calls += 1;
      byTenant[tid].tokens += Number(a.token_prompt || 0) + Number(a.token_completion || 0);
    }

    const subByTenant: Record<string, { plan_name?: string; monthly_price: number }> = {};
    for (const s of subscriptions.data || []) {
      const tid = s.tenant_id as string;
      if (!subByTenant[tid]) subByTenant[tid] = { monthly_price: 0 };
      subByTenant[tid].plan_name = s.plan_name as string;
      subByTenant[tid].monthly_price = Number(s.monthly_price || 0);
    }

    return (tenants.data || []).map((t) => {
      const c = byTenant[t.id] || { cost: 0, calls: 0, tokens: 0 };
      const sub = subByTenant[t.id] || { monthly_price: 0 };
      const apiCost = Math.round(c.cost * 100) / 100;
      const packagePrice = sub.monthly_price || 0;
      return {
        tenant_id: t.id,
        company_name: t.company_name || 'İsimsiz',
        status: t.status || 'active',
        ai_cost_30d: apiCost,
        calls_30d: c.calls,
        tokens_30d: c.tokens,
        plan: sub.plan_name || '—',
        package_price: packagePrice,
        contribution: Math.round((packagePrice - apiCost) * 100) / 100,
      };
    });
  }

  @Roles('owner')
  @Put('tenants/:id/status')
  async toggleStatus(@Param('id') id: string, @Body() body: { status: string }) {
    const { data, error } = await this.supabase.db
      .from('tenants')
      .update({ status: body.status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  @Roles('owner')
  @Put('tenants/:id/quota')
  async adjustQuota(@Param('id') id: string, @Body() body: { order_limit: number }) {
    // Update subscription order_limit
    const { error } = await this.supabase.db
      .from('subscriptions')
      .update({ order_limit: body.order_limit })
      .eq('tenant_id', id);
    if (error) throw new Error(error.message);
    return { success: true, order_limit: body.order_limit };
  }
}
