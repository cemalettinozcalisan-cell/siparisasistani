import { Injectable, Logger } from '@nestjs/common';
import { VoiceProviderFactory } from './providers/provider.factory';
import { TextNormalizer } from './utils/text-normalizer';
import { SplitEngine, SpeechFragment } from './utils/split-engine';
import { VoiceCacheService } from './cache/voice-cache.service';
import { VoiceConfig } from './providers/voice-provider.interface';
import { SupabaseService } from '../common/supabase.client';

export interface GenerateSpeechResult {
  audio: Buffer;
  provider: string;
  persona: string;
  durationMs: number;
  cached: boolean;
  text: string;
}

export interface GenerateSpeechBatchResult {
  fragments: SpeechFragment[];
  audioBuffers: Buffer[];
  provider: string;
  persona: string;
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly factory: VoiceProviderFactory,
    private readonly normalizer: TextNormalizer,
    private readonly splitter: SplitEngine,
    private readonly cache: VoiceCacheService,
    private readonly supabase: SupabaseService,
  ) {}

  async generateSpeech(text: string, tenantId?: string): Promise<GenerateSpeechResult> {
    const settings = tenantId ? await this.getVoiceSettings(tenantId) : null;
    const persona = settings?.voicePersona || 'zeynep';
    const providerName = settings?.voiceProvider || this.factory.listProviders()[0];

    const config: VoiceConfig = {
      persona,
      speed: settings?.speed ?? 1.0,
      stability: settings?.stability ?? 0.5,
      style: settings?.style ?? 0.5,
      similarity: settings?.similarity ?? 0.75,
      pitch: settings?.pitch ?? 1.0,
      language: 'tr',
    };

    const normalized = this.normalizer.normalize(text);

    // SSML wrapping for natural speech (adds pauses and prosody)
    const withSSML = settings?.voice_gender ? this.wrapSSML(normalized) : normalized;

    const hashKey = this.cache.hashKey(withSSML, persona);

    const cached = await this.cache.get(hashKey);
    if (cached) {
      this.logger.debug(`Voice cache hit: ${hashKey}`);
      await this.logVoice(tenantId, providerName, persona, withSSML.length, 0, true, 0, cached.length);
      return { audio: cached, provider: providerName, persona, durationMs: 0, cached: true, text: withSSML };
    }

    const start = Date.now();
    const result = await this.factory.generateWithFailover(withSSML, config, providerName);
    const durationMs = Date.now() - start;

    await this.cache.set(hashKey, result.audio, tenantId, persona);

    if (tenantId) {
      this.cache.storeFile(hashKey, result.audio, tenantId, withSSML, persona, result.provider, durationMs)
        .catch((err) => this.logger.debug(`Cache store skipped: ${(err as Error).message}`));
    }

    const cost = this.factory.getProvider(result.provider).estimateCost(normalized.length);
    await this.logVoice(tenantId, result.provider, persona, normalized.length, durationMs, false, cost, result.audio.length);

    return {
      audio: result.audio,
      provider: result.provider,
      persona,
      durationMs,
      cached: false,
      text: withSSML,
    };
  }

  async generateSpeechBatch(
    text: string, tenantId?: string,
  ): Promise<GenerateSpeechBatchResult> {
    const fragments = this.splitter.split(text);
    const settings = tenantId ? await this.getVoiceSettings(tenantId) : null;
    const persona = settings?.voicePersona || 'zeynep';
    const providerName = settings?.voiceProvider || 'elevenlabs';

    const audioBuffers: Buffer[] = [];
    for (const fragment of fragments) {
      const result = await this.generateSpeech(fragment.text, tenantId);
      audioBuffers.push(result.audio);
    }

    return {
      fragments: this.splitter.reindex(fragments),
      audioBuffers,
      provider: providerName,
      persona,
    };
  }

  async previewVoice(text: string, persona: string, providerName: string): Promise<Buffer> {
    const provider = this.factory.getProvider(providerName);
    const config: VoiceConfig = { persona, speed: 1.0, stability: 0.5, style: 0.5, similarity: 0.75, language: 'tr' };
    const normalized = this.normalizer.normalize(text);
    return provider.generateSpeech(normalized, config);
  }

  private async getVoiceSettings(tenantId: string) {
    const { data } = await this.supabase.db
      .from('tenant_settings')
      .select('voice_provider, voice_persona, voice_speed, voice_stability, voice_style, voice_similarity, voice_pitch, voice_cache_enabled, voice_fallback_enabled, voice_gender')
      .eq('tenant_id', tenantId)
      .single();
    return data ? {
      voiceProvider: data.voice_provider || 'elevenlabs',
      voicePersona: data.voice_persona || 'zeynep',
      speed: Number(data.voice_speed) || 1.0,
      stability: Number(data.voice_stability) ?? 0.5,
      style: Number(data.voice_style) ?? 0.5,
      similarity: Number(data.voice_similarity) ?? 0.75,
      pitch: Number(data.voice_pitch) ?? 1.0,
      cacheEnabled: data.voice_cache_enabled ?? true,
      fallbackEnabled: data.voice_fallback_enabled ?? true,
      voice_gender: data.voice_gender || null,
    } : null;
  }

  private async logVoice(
    tenantId: string | undefined, provider: string, persona: string,
    textLength: number, durationMs: number, cacheHit: boolean,
    cost: number, audioSize: number,
  ) {
    if (!tenantId) return;
    try {
      await this.supabase.db.from('voice_logs').insert({
        tenant_id: tenantId,
        provider, persona,
        text_length: textLength,
        duration_ms: durationMs,
        cache_hit: cacheHit,
        cost,
        audio_size: audioSize,
        success: true,
      });
      } catch {}
  }

  private wrapSSML(text: string): string {
    // Add natural speech pauses and prosody for voice generation
    // Adds <break> tags at commas, periods, and question marks
    let wrapped = text
      .replace(/\. /g, '. <break time="400ms"/> ')
      .replace(/, /g, ', <break time="200ms"/> ')
      .replace(/\? /g, '? <break time="500ms"/> ')
      .replace(/\.\.\./g, '<break time="600ms"/>')
      .replace(/!/g, '! <break time="300ms"/>');

    // Slow down the overall speech rate slightly for natural flow
    wrapped = `<speak><prosody rate="0.95">${wrapped}</prosody></speak>`;
    return wrapped;
  }
}
