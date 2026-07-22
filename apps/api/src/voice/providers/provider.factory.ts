import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoiceProvider, VoiceHealthStatus } from './voice-provider.interface';
import { ElevenLabsProvider } from './elevenlabs.provider';
import { OpenAiTtsProvider } from './openai-tts.provider';

@Injectable()
export class VoiceProviderFactory {
  private readonly logger = new Logger(VoiceProviderFactory.name);
  private providers: Map<string, VoiceProvider> = new Map();

  private primaryProviderName: string;
  private fallbackProviderName: string;

  constructor(private config: ConfigService) {
    this.register('elevenlabs', new ElevenLabsProvider(config));
    this.register('openai', new OpenAiTtsProvider(config));

    this.primaryProviderName = this.config.get<string>('VOICE_PRIMARY_PROVIDER', 'elevenlabs');
    this.fallbackProviderName = this.config.get<string>('VOICE_FALLBACK_PROVIDER', 'openai');

    this.logger.log(`Voice providers: primary=${this.primaryProviderName}, fallback=${this.fallbackProviderName}`);
  }

  private register(name: string, provider: VoiceProvider) {
    this.providers.set(name, provider);
  }

  getProvider(name?: string): VoiceProvider {
    const providerName = name || this.primaryProviderName;
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Voice provider "${providerName}" not found`);
    return provider;
  }

  async generateWithFailover(
    text: string, config: { persona?: string; speed?: number } = {},
    preferredProvider?: string,
  ): Promise<{ audio: Buffer; provider: string }> {
    const order = preferredProvider
      ? [preferredProvider, this.fallbackProviderName]
      : [this.primaryProviderName, this.fallbackProviderName];

    for (const providerName of order) {
      try {
        const provider = this.getProvider(providerName);
        const audio = await provider.generateSpeech(text, config);
        return { audio, provider: providerName };
      } catch (err) {
        this.logger.warn(`Voice provider ${providerName} failed: ${(err as Error).message}`);
      }
    }

    const last = this.getProvider(order[order.length - 1]);
    const audio = await last.generateSpeech(text, config);
    return { audio, provider: order[order.length - 1] };
  }

  async healthCheckAll(): Promise<Record<string, VoiceHealthStatus>> {
    const results: Record<string, VoiceHealthStatus> = {};
    for (const [name, provider] of this.providers) {
      results[name] = await provider.healthCheck();
    }
    return results;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
