import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiProvider, AiCompletionRequest, AiCompletionResult } from '@siparis/types';

const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  'deepseek-chat': { input: 0.00027, output: 0.00110 },
  'deepseek-reasoner': { input: 0.00055, output: 0.00219 },
  'gpt-4o-mini': { input: 0.00015, output: 0.00060 },
  'gpt-4o': { input: 0.00250, output: 0.01000 },
};

@Injectable()
export class DeepSeekProvider implements AiProvider {
  name = 'deepseek' as const;
  private readonly logger = new Logger(DeepSeekProvider.name);
  private client: OpenAI;
  private model: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config: ConfigService) {
    const timeoutMs = Number(config.get<string>('AI_TIMEOUT_MS', '15000'));
    const retries = Number(config.get<string>('AI_MAX_RETRIES', '2'));
    this.client = new OpenAI({
      apiKey: config.get<string>('DEEPSEEK_API_KEY'),
      baseURL: 'https://api.deepseek.com/v1',
      timeout: timeoutMs,
      maxRetries: retries,
    });
    this.model = config.get<string>('DEEPSEEK_MODEL', 'deepseek-chat');
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
        const usage = response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined;

        this.logger.debug(
          `DeepSeek OK: ${this.model} | ${usage?.totalTokens || 0} tokens | ${latency}ms | attempt ${attempt}`,
        );

        return {
          content: response.choices[0]?.message?.content || '',
          usage,
        };
      } catch (err) {
        lastError = err as Error;
        const isTimeout = (err as Error).name === 'AbortError';
        const isRateLimit = (err as Error).message?.includes('429') || (err as Error).message?.includes('rate');

        this.logger.warn(
          `DeepSeek attempt ${attempt}/${this.maxRetries + 1} failed: ${(err as Error).message}${isTimeout ? ' (timeout)' : ''}${isRateLimit ? ' (rate limit)' : ''}`,
        );

        if (!isTimeout && !isRateLimit && attempt <= this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (attempt > this.maxRetries) break;
      }
    }

    throw lastError || new Error('DeepSeek: all retries exhausted');
  }

  estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    const rates = COST_PER_1K_TOKENS[model] || COST_PER_1K_TOKENS['deepseek-chat'];
    return (promptTokens / 1000) * rates.input + (completionTokens / 1000) * rates.output;
  }
}
