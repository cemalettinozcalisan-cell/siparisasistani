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
  }) {
    const start = Date.now();
    const provider = this.aiFactory.getProvider();

    const tenantNames: Record<string, string> = {
      'a0000000-0000-0000-0000-000000000001': 'Ahmet İpek Sucukları',
      'demo-tenant-id': 'Demo İşletme',
    };

    const promptCtx = {
      tenantId: body.tenantId,
      tenantName: tenantNames[body.tenantId],
      channel: 'phone' as const,
      currentState: 'ordering',
      customerPhone: '',
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
      promptPreview: fullPrompt.substring(0, 2000),
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
      components: {
        businessInfo: true,
        productCatalog: true,
        paymentMethods: true,
        conversationRules: true,
        customerContext: true,
        taskDefinition: true,
      },
    };
  }

  @Get('audit/:tenantId')
  async getAudit(@Param('tenantId') tenantId: string) {
    return this.audit.getByTenant(tenantId, 50);
  }
}
