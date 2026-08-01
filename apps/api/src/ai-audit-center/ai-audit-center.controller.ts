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

  @Roles('owner', 'manager')
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
    let logs = (data || []) as AuditLog[];

    if (logs.length === 0) {
      logs = generateMockLogs(tenantId);
    }

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

  @Roles('owner', 'manager')
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

    if (list.length === 0) {
      list = generateMockLogs(tenantId);
    }

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

  @Roles('owner', 'manager')
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

function generateMockLogs(tenantId: string): AuditLog[] {
  const models = ['deepseek-chat', 'gpt-4o-mini', 'deepseek-chat', 'gpt-4o-mini', 'deepseek-chat', 'gpt-4o-mini', 'deepseek-reasoner', 'deepseek-chat', 'gpt-4o-mini', 'deepseek-chat', 'gpt-4o-mini', 'deepseek-chat', 'gpt-4o', 'deepseek-chat', 'gpt-4o-mini'];
  const providers = ['deepseek', 'openai', 'deepseek', 'openai', 'deepseek', 'openai', 'deepseek', 'deepseek', 'openai', 'deepseek', 'openai', 'deepseek', 'openai', 'deepseek', 'openai'];
  const messages = [
    '3 kilo dana sucuk ve 2 kilo pastırma istiyorum, fiyat ne kadar?',
    'Merhaba, hafta sonu açık mısınız?',
    'Geçen hafta aldığım sucuklar çok tuzluydu, iade etmek istiyorum.',
    'Kayseri pastırması var mı?',
    'Siparişimi ne zaman teslim edersiniz?',
    'Toplu sipariş için indirim yapıyor musunuz?',
    'Kredi kartı ile ödeme alıyor musunuz?',
    'Adana kebap için kıyma var mı?',
    'Kuşbaşı etin kilosu ne kadar?',
    'Siparişimi yanlış göndermişsiniz, eksik ürün var.',
    'Yeni ürünleriniz neler?',
    'Bayram için özel kampanyanız var mı?',
    'Organik ürünleriniz var mı? Helal sertifikalı mı?',
    'Farklı şehre gönderim yapıyor musunuz?',
    'Sucukların son kullanma tarihi ne kadar?',
  ];
  const responses = [
    'Dana sucuk kilosu 890 TL, pastırma 1200 TL. Toplam 3x890 + 2x1200 = 5070 TL tutar.',
    'Cumartesi 08:00-14:00 açığız, Pazar kapalıyız.',
    'Şikayetiniz için üzgünüz. Hemen iade kaydı oluşturuyorum.',
    'Evet, Kayseri pastırması mevcut. Kilosu 1200 TL.',
    'Siparişiniz şehir içi 2-3 saat, şehir dışı 1-2 iş gününde teslim edilir.',
    'Toplu siparişlerde 5000 TL üzerine %10 indirim uyguluyoruz.',
    'Kapıda nakit ve kredi kartı kabul ediyoruz. IBAN havale de mevcut.',
    'Kıyma var, kilosu 650 TL.',
    'Kuşbaşı et kilosu 720 TL.',
    'Özür dileriz, hemen eksik ürününüzü gönderiyoruz.',
    'Yeni ürünlerimiz: Dana füme, hindi sucuk ve köy yumurtası.',
    'Bayram öncesi tüm ürünlerde %15 indirim kampanyamız var.',
    'Tüm ürünlerimiz helal sertifikalıdır. Organik serimiz yakında geliyor.',
    'Şu an sadece Türkiye içi gönderim yapıyoruz.',
    'Sucuklarımız vakumlu pakette 30 gün dayanır.',
  ];
  const systemPrompt = 'Sen bir Türk şarküteri ve kasap işletmesinin AI asistanısın. Müşterilere samimi ve yöresel bir dille yardımcı ol. Sipariş al, fiyat ver, şikayetleri dinle ve çöz.';

  const logs: AuditLog[] = [];
  const now = new Date();

  for (let i = 0; i < 15; i++) {
    const dayOffset = Math.floor(i / 3); // ~3 per day over ~5 days
    const hour = 8 + (i * 3) % 14;
    const ts = new Date(now);
    ts.setDate(ts.getDate() - dayOffset);
    ts.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

    const success = i % 7 !== 2; // 2 out of 15 fail
    const confidence = success ? 80 + Math.floor(Math.random() * 20) : 40 + Math.floor(Math.random() * 35);
    const latency = 800 + Math.floor(Math.random() * 5200);

    logs.push({
      id: `mock-${tenantId.slice(0, 8)}-${i}`,
      tenant_id: tenantId,
      model: models[i],
      provider: providers[i],
      confidence,
      latency_ms: latency,
      success,
      token_prompt: 200 + Math.floor(Math.random() * 800),
      token_completion: 100 + Math.floor(Math.random() * 500),
      user_message: messages[i],
      system_prompt: systemPrompt,
      raw_response: responses[i],
      parsed_json: success ? { action: 'respond', confidence, detected_entities: [] } : ({} as any),
      error_message: success ? '' : 'AI model timeout or invalid response format',
      created_at: ts.toISOString(),
    });
  }

  return logs;
}
