import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

interface AuditLog {
  id: string;
  tenant_id: string;
  model: string;
  provider: string;
  confidence: number;
  latency_ms: number;
  success: boolean;
  token_prompt: number;
  token_completion: number;
  user_message: string;
  system_prompt: string;
  raw_response: string;
  parsed_json: Record<string, unknown>;
  error_message: string;
  created_at: string;
}

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'claude-3-5-sonnet': { input: 3.00, output: 15.00 },
};

const DEFAULT_COST = { input: 0.15, output: 0.60 };

function getCost(model: string, promptTokens: number, completionTokens: number): number {
  const rate = MODEL_COSTS[model] || DEFAULT_COST;
  return (promptTokens * rate.input + completionTokens * rate.output) / 1_000_000;
}

@UseGuards(TenantGuard)
@Controller('ai-audit')
export class AiAuditCenterController {
  constructor(private readonly supabase: SupabaseService) {}

  @Roles('owner')
  @Get('stats/:tenantId')
  async stats(
    @Param('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('model') modelFilter?: string,
    @Query('status') statusFilter?: string,
  ) {
    const now = new Date();
    const startDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = to ? new Date(to) : now;
    endDate.setHours(23, 59, 59, 999);

    let query = this.supabase.db
      .from('ai_audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (modelFilter) query = query.eq('model', modelFilter);

    const { data } = await query;
    const logs = (data || []) as AuditLog[];

    let filtered = logs;
    if (statusFilter === 'failed') filtered = logs.filter((l) => !l.success);
    else if (statusFilter === 'low_confidence') filtered = logs.filter((l) => l.confidence < 80);

    const total = filtered.length;
    const successful = filtered.filter((l) => l.success).length;
    const failed = filtered.filter((l) => !l.success).length;
    const avgConfidence = total > 0 ? Math.round(filtered.reduce((s, l) => s + (l.confidence || 0), 0) / total) : 0;
    const avgLatency = total > 0 ? Math.round(filtered.reduce((s, l) => s + (l.latency_ms || 0), 0) / total) : 0;
    const totalTokens = filtered.reduce((s, l) => s + (l.token_prompt || 0) + (l.token_completion || 0), 0);
    const estimatedCost = filtered.reduce((s, l) => s + getCost(l.model, l.token_prompt || 0, l.token_completion || 0), 0);

    // Model distribution
    const modelMap: Record<string, number> = {};
    filtered.forEach((l) => {
      const m = l.model || 'unknown';
      modelMap[m] = (modelMap[m] || 0) + 1;
    });
    const modelDistribution = Object.entries(modelMap)
      .map(([model, count]) => ({ model, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    // Daily trend (last 7 days)
    const dailyTrend: { date: string; total: number; success: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const dayLogs = logs.filter((l) => l.created_at.startsWith(ds));
      dailyTrend.push({
        date: ds,
        total: dayLogs.length,
        success: dayLogs.filter((l) => l.success).length,
      });
    }

    // Available models
    const models = [...new Set(logs.map((l) => l.model).filter(Boolean))];

    return {
      total,
      successful,
      failed,
      aiSuccessRate: total > 0 ? Math.round((successful / total) * 100) : 0,
      avgConfidence,
      avgLatency,
      totalTokens,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      modelDistribution,
      dailyTrend,
      models,
    };
  }

  @Roles('owner')
  @Get('conversations/:tenantId')
  async conversations(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('model') modelFilter?: string,
    @Query('status') statusFilter?: string,
  ) {
    const now = new Date();
    const startDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = to ? new Date(to) : now;
    endDate.setHours(23, 59, 59, 999);

    let query = this.supabase.db
      .from('ai_audit_logs')
      .select('id, tenant_id, model, provider, confidence, latency_ms, success, token_prompt, token_completion, created_at, user_message')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(parseInt(limit || '100'));

    if (modelFilter) query = query.eq('model', modelFilter);

    const { data } = await query;
    let list = (data || []) as AuditLog[];

    if (statusFilter === 'failed') list = list.filter((l) => !l.success);
    else if (statusFilter === 'low_confidence') list = list.filter((l) => l.confidence < 80);

    return list.map((l) => ({
      id: l.id,
      tenantId: l.tenant_id,
      model: l.model,
      provider: l.provider,
      confidence: l.confidence,
      latency: l.latency_ms,
      success: l.success,
      tokens: (l.token_prompt || 0) + (l.token_completion || 0),
      userMessage: (l.user_message || '').substring(0, 120),
      createdAt: l.created_at,
    }));
  }

  @Roles('owner')
  @Get('conversations/:tenantId/:id')
  async conversationDetail(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    const { data } = await this.supabase.db
      .from('ai_audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    return data || { error: 'Not found' };
  }
}
