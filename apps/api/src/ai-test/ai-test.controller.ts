import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { AiProviderFactory } from '../ai/providers/ai-provider.factory';
import { PromptEngineService } from '../ai/prompt-engine/prompt-engine.service';
import { AiParserService } from '../ai/conversation/parser/ai-parser';
import { AiAuditService } from '../ai/audit/ai-audit.service';
import { SupabaseService } from '../common/supabase.client';

@Controller('ai-test')
export class AiTestController {
  constructor(
    private readonly aiFactory: AiProviderFactory,
    private readonly promptEngine: PromptEngineService,
    private readonly parser: AiParserService,
    private readonly audit: AiAuditService,
    private readonly supabase: SupabaseService,
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
    const channel = (body.channel || 'phone') as 'phone' | 'whatsapp' | 'instagram';

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
      channel: body.channel as 'phone' | 'whatsapp',
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

  private detectState(messages: { role: string; content: string }[]): string {
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant')?.content || '';
    if (!lastAssistantMsg) return 'welcome';
    if (/onay|doğru mu|teyit|olustur/i.test(lastAssistantMsg)) return 'customer_confirmation';
    if (/adres|teslimat|şehir|ilçe|semt|sokak|cadde|mahalle|neresinde|gönderiyoruz/i.test(lastAssistantMsg)) return 'address';
    if (/ödeme|kart|iban|havale/i.test(lastAssistantMsg)) return 'payment';
    if (/telefon|numara|ulaşabilir/i.test(lastAssistantMsg)) return 'asking_phone';
    return 'ordering';
  }
}
