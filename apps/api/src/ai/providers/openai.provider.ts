import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiProvider, AiCompletionRequest, AiCompletionResult } from '@siparis/types';

@Injectable()
export class OpenAIProvider implements AiProvider {
  name = 'openai' as const;
  private readonly logger = new Logger(OpenAIProvider.name);
  private client: OpenAI;
  private model: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config: ConfigService) {
    const timeoutMs = Number(config.get<string>('AI_TIMEOUT_MS', '15000'));
    const retries = Number(config.get<string>('AI_MAX_RETRIES', '2'));
    this.client = new OpenAI({
      apiKey: config.get<string>('OPENAI_API_KEY'),
      timeout: timeoutMs,
      maxRetries: retries,
    });
    this.model = config.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
    this.timeout = timeoutMs;
    this.maxRetries = retries;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const start = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);

        const response = await this.client.chat.completions.create({
          model: request.model || this.model,
          messages: [
            ...(request.systemPrompt
              ? [{ role: 'system' as const, content: request.systemPrompt }]
              : []),
            ...request.messages.map((m) => ({
              role: m.role as 'system' | 'user' | 'assistant',
              content: m.content,
            })),
          ],
          temperature: request.temperature ?? 0.3,
          max_tokens: request.maxTokens ?? 1024,
        }, { signal: controller.signal });

        clearTimeout(timer);

        const latency = Date.now() - start;
        this.logger.debug(`OpenAI OK: ${this.model} | ${latency}ms | attempt ${attempt}`);

        return {
          content: response.choices[0]?.message?.content || '',
          usage: response.usage
            ? {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
              }
            : undefined,
        };
      } catch (err) {
        lastError = err as Error;
        const isTimeout = (err as Error).name === 'AbortError';
        const isRateLimit = (err as Error).message?.includes('429');

        this.logger.warn(
          `OpenAI attempt ${attempt} failed: ${(err as Error).message}${isTimeout ? ' (timeout)' : ''}`,
        );

        if (!isTimeout && !isRateLimit && attempt <= this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        if (attempt > this.maxRetries) break;
      }
    }
    throw lastError || new Error('OpenAI: all retries exhausted');
  }
}
