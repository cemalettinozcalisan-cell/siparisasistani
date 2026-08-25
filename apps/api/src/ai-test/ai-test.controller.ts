import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { AiProviderFactory } from '../ai/providers/ai-provider.factory';
import { PromptEngineService } from '../ai/prompt-engine/prompt-engine.service';
import { AiParserService } from '../ai/conversation/parser/ai-parser';
import { AiAuditService } from '../ai/audit/ai-audit.service';
import { SupabaseService } from '../common/supabase.client';
import { PromptVersionService } from './prompt-version.service';

@Controller('ai-test')
export class AiTestController {
  constructor(
    private readonly aiFactory: AiProviderFactory,
    private readonly promptEngine: PromptEngineService,
    private readonly parser: AiParserService,
    private readonly audit: AiAuditService,
    private readonly supabase: SupabaseService,
    private readonly promptVersions: PromptVersionService,
  ) {}

  @Post('simulate')
  async simulate(@Body() body: {
    tenantId: string;
    messages: { role: string; content: string }[];
    channel?: string;
    customerPhone?: string;
  }) {
    const start = Date.now();
    const provider = this.aiFactory.getProvider();
    const channel = (body.channel || 'phone') as 'phone' | 'whatsapp' | 'instagram' | 'sms';

    // Resolve tenant name from DB
    let tenantName = 'Demo İşletme';
    try {
      const { data } = await this.supabase.db
        .from('tenants')
        .select('company_name')
        .eq('id', body.tenantId)
        .single();
      if (data) tenantName = data.company_name as string;
    } catch {}

    // Lookup customer if phone provided
    let customerName = '';
    if (body.customerPhone) {
      const { data } = await this.supabase.db
        .from('customers')
        .select('name')
        .eq('tenant_id', body.tenantId)
        .eq('phone', body.customerPhone)
        .is('deleted_at', null)
        .limit(1);
      if (data && data.length > 0) customerName = data[0].name as string;
    }

    const promptCtx = {
      tenantId: body.tenantId,
      tenantName,
      channel,
      currentState: this.detectState(body.messages),
      customerPhone: body.customerPhone || '',
      customerName,
    };

    const systemPrompt = await this.promptEngine.buildSystemPrompt(promptCtx);
    const outputFormat = this.promptEngine.getOutputFormat();
    const fullPrompt = [systemPrompt, '', outputFormat].join('\n');

    const aiMessages = [
      { role: 'system' as const, content: fullPrompt },
      ...body.messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const response = await provider.complete({ messages: aiMessages, temperature: 0.3 });
    const parsed = this.parser.parseAiResponse(response.content);
    const latency = Date.now() - start;

    await this.audit.log({
      tenantId: body.tenantId,
      systemPrompt: fullPrompt,
      userMessage: body.messages.map((m) => m.content).join('\n'),
      model: provider.name,
      provider: provider.name,
      rawResponse: response.content,
      parsedJson: parsed as unknown as Record<string, unknown>,
      confidence: parsed.confidence || 0,
      latencyMs: latency,
      success: true,
    });

    return {
      response: response.content,
      parsed,
      latency,
      model: provider.name,
      promptPreview: fullPrompt.substring(0, 3000),
      detectedState: this.detectState(body.messages),
      intent: parsed.intent || 'unknown',
      channel,
      hasMemory: !!customerName,
    };
  }

  @Post('prompt-preview')
  async promptPreview(@Body() body: {
    tenantId: string;
    channel: string;
    state: string;
  }) {
    const promptCtx = {
      tenantId: body.tenantId,
      channel: body.channel as 'phone' | 'whatsapp' | 'instagram' | 'sms',
      currentState: body.state,
      customerPhone: '',
    };

    const systemPrompt = await this.promptEngine.buildSystemPrompt(promptCtx);
    const outputFormat = this.promptEngine.getOutputFormat();

    return {
      prompt: [systemPrompt, '', outputFormat].join('\n'),
    };
  }

  @Get('audit/:tenantId')
  async getAudit(@Param('tenantId') tenantId: string) {
    return this.audit.getByTenant(tenantId, 50);
  }

  @Post('prompt-save')
  async saveCustomPrompt(@Body() body: { tenantId: string; state: string; channel: string; prompt: string }) {
    const { data: settings } = await this.supabase.db
      .from('tenant_settings')
      .select('custom_prompts')
      .eq('tenant_id', body.tenantId)
      .maybeSingle();

    const customPrompts = (settings as any)?.custom_prompts || {};
    const key = `${body.channel}_${body.state}`;
    customPrompts[key] = body.prompt;

    await this.supabase.db
      .from('tenant_settings')
      .update({ custom_prompts: customPrompts } as any)
      .eq('tenant_id', body.tenantId);

    return { success: true, key };
  }

  @Get('prompt-custom/:tenantId')
  async getCustomPrompts(@Param('tenantId') tenantId: string) {
    const { data } = await this.supabase.db
      .from('tenant_settings')
      .select('custom_prompts')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    return (data as any)?.custom_prompts || {};
  }

  @Post('prompt-reset')
  async resetCustomPrompt(@Body() body: { tenantId: string; state: string; channel: string }) {
    const { data: settings } = await this.supabase.db
      .from('tenant_settings')
      .select('custom_prompts')
      .eq('tenant_id', body.tenantId)
      .maybeSingle();

    const customPrompts = (settings as any)?.custom_prompts || {};
    const key = `${body.channel}_${body.state}`;
    delete customPrompts[key];

    await this.supabase.db
      .from('tenant_settings')
      .update({ custom_prompts: customPrompts } as any)
      .eq('tenant_id', body.tenantId);

    return { success: true, key };
  }

  /** Prompt sürümleme & onay kapısı (3B) */

  @Post('prompt-version/save-draft')
  async savePromptDraft(@Body() body: { tenantId: string; channel: string; state: string; prompt: string }) {
    const data = await this.promptVersions.saveDraft(body.tenantId, body.channel, body.state, body.prompt);
    return { success: !!data, version: data?.version || null };
  }

  @Post('prompt-version/approve')
  async approvePrompt(@Body() body: { tenantId: string; channel: string; state: string; version: number }) {
    return this.promptVersions.approve(body.tenantId, body.channel, body.state, body.version);
  }

  @Post('prompt-version/activate')
  async activatePrompt(@Body() body: { tenantId: string; channel: string; state: string; version: number }) {
    const data = await this.promptVersions.activate(body.tenantId, body.channel, body.state, body.version);
    return { success: !!data };
  }

  @Get('prompt-version/history/:tenantId/:channel/:state')
  async promptHistory(@Param('tenantId') tenantId: string, @Param('channel') channel: string, @Param('state') state: string) {
    return this.promptVersions.history(tenantId, channel, state);
  }

  private detectState(messages: { role: string; content: string }[]): string {
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant')?.content || '';
    if (!lastAssistantMsg) return 'GREETING';
    if (/kabul ediyorum|onaylıyorum|teyit|olustur|devam/i.test(lastAssistantMsg)) return 'FINAL_CONFIRMATION';
    if (/ödeme|kart|iban|havale|kapıda|nakit/i.test(lastAssistantMsg)) return 'ASKING_PAYMENT';
    if (/telefon|numara|ulaşabilir/i.test(lastAssistantMsg)) return 'ASKING_PHONE';
    if (/adres|teslimat|şehir|ilçe|semt|sokak|cadde|mahalle|neresinde|gönderiyoruz/i.test(lastAssistantMsg)) return 'ASKING_ADDRESS';
    if (/ad.*soyad|isminiz|tanış|memnun/i.test(lastAssistantMsg)) return 'ISIM';
    if (/özet|toplam|tutar|yaklaşık|onay/i.test(lastAssistantMsg)) return 'SUMMARIZING';
    if (/kampanya|fırsat|indirim|hediye/i.test(lastAssistantMsg)) return 'CAMPAIGN';
    return 'ORDERING';
  }
}
