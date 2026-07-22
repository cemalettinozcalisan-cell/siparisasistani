import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AiCompletionRequest, AiCompletionResult } from '@siparis/types';
import { OpenAIProvider } from './openai.provider';
import { DeepSeekProvider } from './deepseek.provider';

@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name);
  private providers: Map<string, AiProvider> = new Map();
  private fallbackOrder: string[];

  constructor(private config: ConfigService) {
    this.register('openai', new OpenAIProvider(config));
    this.register('deepseek', new DeepSeekProvider(config));

    const primary = this.config.get<string>('AI_PRIMARY_PROVIDER', 'deepseek');
    const fallback = this.config.get<string>('AI_FALLBACK_PROVIDER', 'openai');
    this.fallbackOrder = [primary, fallback];
  }

  private register(name: string, provider: AiProvider) {
    this.providers.set(name, provider);
  }

  getProvider(name?: string): AiProvider {
    const providerName = name || this.config.get<string>('AI_PROVIDER', 'deepseek');
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`AI provider "${providerName}" not found`);
    }
    return provider;
  }

  async completeWithFailover(request: AiCompletionRequest): Promise<{
    result: AiCompletionResult;
    providerUsed: string;
  }> {
    for (const providerName of this.fallbackOrder) {
      try {
        const provider = this.getProvider(providerName);
        const result = await provider.complete(request);
        return { result, providerUsed: providerName };
      } catch (err) {
        this.logger.warn(`Provider ${providerName} failed: ${(err as Error).message}. Trying fallback...`);
      }
    }

    const lastProvider = this.fallbackOrder[this.fallbackOrder.length - 1];
    const provider = this.getProvider(lastProvider);
    const result = await provider.complete(request);
    return { result, providerUsed: lastProvider };
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getFallbackOrder(): string[] {
    return [...this.fallbackOrder];
  }
}
