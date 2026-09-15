import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase.client';

@Injectable()
export class AiPricingService {
  private readonly logger = new Logger(AiPricingService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {}

  async costFor(provider: string, model: string, inputTokens: number, outputTokens: number): Promise<number> {
    try {
      const { data, error } = await this.supabase.db
        .from('ai_pricing')
        .select('input_price_per_1k, output_price_per_1k')
        .eq('provider', provider)
        .eq('model', model)
        .lte('effective_from', new Date().toISOString())
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return this.fallbackCost(provider, model, inputTokens, outputTokens);
      }

      const { input_price_per_1k, output_price_per_1k } = data;
      return (inputTokens / 1000) * input_price_per_1k + (outputTokens / 1000) * output_price_per_1k;
    } catch (e) {
      this.logger.warn(`Pricing lookup failed: ${(e as Error).message}`);
      return this.fallbackCost(provider, model, inputTokens, outputTokens);
    }
  }

  private fallbackCost(provider: string, model: string, inputTokens: number, outputTokens: number): number {
    const costs: Record<string, Record<string, { input: number; output: number }>> = {
      deepseek: {
        'deepseek-chat': { input: 0.00027, output: 0.00110 },
        'deepseek-reasoner': { input: 0.00055, output: 0.00219 },
      },
      openai: {
        'gpt-4o-mini': { input: 0.00015, output: 0.00060 },
        'gpt-4o': { input: 0.00250, output: 0.01000 },
      },
      elevenlabs: { tts: { input: 0, output: 0 } },
    };
    const prices = costs[provider]?.[model] ?? { input: 0, output: 0 };
    return (inputTokens / 1000) * prices.input + (outputTokens / 1000) * prices.output;
  }
}