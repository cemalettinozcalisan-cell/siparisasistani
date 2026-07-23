import { Controller, Get, Param, Query } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Controller('ai-audit')
export class AiAuditCenterController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get('stats/:tenantId')
  async stats(@Param('tenantId') tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: logs } = await this.supabase.db
      .from('ai_audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });

    const list = logs || [];
    const total = list.length;
    const successful = list.filter((l: Record<string, unknown>) => l.success).length;
    const failed = list.filter((l: Record<string, unknown>) => !l.success).length;
    const avgConfidence = total > 0
      ? Math.round(list.reduce((s: number, l: Record<string, unknown>) => s + Number(l.confidence || 0), 0) / total)
      : 0;
    const avgLatency = total > 0
      ? Math.round(list.reduce((s: number, l: Record<string, unknown>) => s + Number(l.latency_ms || 0), 0) / total)
      : 0;

    return { total, successful, failed, avgConfidence, avgLatency, aiSuccessRate: total > 0 ? Math.round((successful / total) * 100) : 0 };
  }

  @Get('conversations/:tenantId')
  async conversations(@Param('tenantId') tenantId: string, @Query('limit') limit?: string) {
    const { data } = await this.supabase.db
      .from('ai_audit_logs')
      .select('id, model, provider, confidence, latency_ms, success, token_prompt, token_completion, created_at, user_message')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit || '100'));

    return (data || []).map((l: Record<string, unknown>) => ({
      id: l.id,
      model: l.model,
      provider: l.provider,
      confidence: l.confidence,
      latency: l.latency_ms,
      success: l.success,
      tokens: (l.token_prompt as number || 0) + (l.token_completion as number || 0),
      userMessage: (l.user_message as string || '').substring(0, 100),
      createdAt: l.created_at,
    }));
  }

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
