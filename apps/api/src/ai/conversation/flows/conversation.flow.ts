import { Injectable, Logger } from '@nestjs/common';
import { AiProviderFactory } from '../../providers/ai-provider.factory';
import { PromptEngineService, PromptContext } from '../../prompt-engine/prompt-engine.service';
import { AiParserService } from '../parser/ai-parser';
import { ConversationState } from '@siparis/types';

interface SessionContext {
  tenantId: string;
  channel: 'phone' | 'whatsapp' | 'sms';
  customerPhone: string;
  customerName?: string;
  messages: { role: string; content: string }[];
  state: ConversationState;
  collectedData: Record<string, unknown>;
  orderConfirmed: boolean;
}

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);
  private sessions: Map<string, SessionContext> = new Map();

  constructor(
    private readonly aiFactory: AiProviderFactory,
    private readonly promptEngine: PromptEngineService,
    private readonly parser: AiParserService,
  ) {}

  async startSession(
    sessionId: string,
    tenantId: string,
    channel: 'phone' | 'whatsapp',
    customerPhone: string,
  ): Promise<string> {
    const promptCtx: PromptContext = {
      tenantId,
      customerPhone,
      channel,
      currentState: 'welcome',
      collectedData: {},
    };

    const systemPrompt = await this.promptEngine.buildSystemPrompt(promptCtx);
    const outputFormat = this.promptEngine.getOutputFormat();
    const fullSystemPrompt = [systemPrompt, '', outputFormat].join('\n');

    const context: SessionContext = {
      tenantId,
      channel,
      customerPhone,
      messages: [{ role: 'system', content: fullSystemPrompt }],
      state: 'welcome',
      collectedData: {},
      orderConfirmed: false,
    };

    this.sessions.set(sessionId, context);
    this.logger.log(`Session started: ${sessionId} for tenant ${tenantId}`);

    const provider = this.aiFactory.getProvider();
    const response = await provider.complete({
      messages: [{ role: 'system' as const, content: fullSystemPrompt }],
      temperature: 0.3,
      maxTokens: 1024,
    });

    context.messages.push({ role: 'assistant', content: response.content });
    return response.content;
  }

  async processMessage(
    sessionId: string,
    userMessage: string,
  ): Promise<{ reply: string; state: ConversationState; data?: unknown }> {
    const context = this.sessions.get(sessionId);
    if (!context) {
      throw new Error('Session not found');
    }

    const promptCtx: PromptContext = {
      tenantId: context.tenantId,
      customerPhone: context.customerPhone,
      customerName: context.customerName,
      channel: context.channel,
      currentState: context.state,
      collectedData: context.collectedData,
    };

    const systemPrompt = await this.promptEngine.buildSystemPrompt(promptCtx);
    const outputFormat = this.promptEngine.getOutputFormat();
    const fullSystemPrompt = [systemPrompt, '', outputFormat].join('\n');

    context.messages[0].content = fullSystemPrompt;
    context.messages.push({ role: 'user', content: userMessage });

    const provider = this.aiFactory.getProvider();
    const response = await provider.complete({
      messages: context.messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      temperature: 0.3,
    });

    const parsed = this.parser.parseAiResponse(response.content);
    context.messages.push({ role: 'assistant', content: response.content });

    if (parsed.customer?.name) {
      context.customerName = parsed.customer.name;
    }

    if (parsed.confirmed) {
      context.orderConfirmed = true;
      context.state = 'order_created';
      return {
        reply: parsed.reply || response.content,
        state: context.state,
        data: parsed,
      };
    }

    context.state = this.determineNextState(context, parsed);
    return {
      reply: parsed.reply || response.content,
      state: context.state,
    };
  }

  private determineNextState(
    context: SessionContext,
    parsed: { customer?: { name?: string }; products?: unknown[] },
  ): ConversationState {
    if (!context.customerName && !parsed.customer?.name) return 'welcome';
    if (!parsed.products || parsed.products.length === 0) return 'ordering';
    if (context.state === 'ordering') return 'customer_confirmation';
    if (context.state === 'customer_confirmation') return 'address';
    if (context.state === 'address') return 'payment';
    return 'ordering';
  }

  getSession(sessionId: string): SessionContext | undefined {
    return this.sessions.get(sessionId);
  }

  endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
