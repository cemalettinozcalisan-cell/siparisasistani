import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { encode } from '@msgpack/msgpack';
import { VoiceProvider, VoiceConfig, VoicePersona, VoiceHealthStatus } from './voice-provider.interface';

const FISH_VOICES: Record<string, string> = {
  bilge: 'cbd0de1278b640e1b91bbaabdab79f25',
  bilge2: 'a78deba25740455ca4875323b94bf455',
  bilge3: 'f904d0913b414e0385e1fbc80f9f3ca4',
  bilge4: 'f85f038f569e4220af373fff18d30a6d',
  bilge5: 'c4531193a56c487ca673ade282a2569f',
  bilge6: '83b3b5813c204b9587e7024a64f38d6f',
  bilge7: 'f11bf83d883f46919021f63971ef91bb',
  bilge8: '06fdb3f69e354650a170f66632ded36a',
  bilge9: 'c80b42cc282d4927b963e2c526c80dde',
  bilge10: '5b8af308c89041ada158e39b4bcbef3c',
};

const VOICES: VoicePersona[] = Object.keys(FISH_VOICES).map((name) => ({
  name,
  gender: 'female',
  ageGroup: '28-40',
  energy: 'calm',
  speed: name === 'bilge8' ? 0.85 : 1.0,
  formality: 'friendly',
  description: `FishAudio ${name}`,
}));

@Injectable()
export class FishAudioProvider implements VoiceProvider {
  readonly name = 'fishaudio';
  private readonly logger = new Logger(FishAudioProvider.name);

  constructor(private readonly config: ConfigService) {}

  private resolveVoiceId(persona?: string): string {
    const value = String(persona || '').trim();
    if (/^[a-f0-9]{32}$/i.test(value)) return value;
    return FISH_VOICES[value] || FISH_VOICES.bilge8;
  }

  async generateSpeech(text: string, config: VoiceConfig = {}): Promise<Buffer> {
    const apiKey = this.config.get<string>('FISH_API_KEY');
    if (!apiKey) throw new Error('FISH_API_KEY tanimli degil');
    const model = this.config.get<string>('FISH_MODEL') || 's2.1-pro';
    const voiceId = this.resolveVoiceId(config.persona);

    const payload = encode({
      text,
      format: 'mp3',
      mp3_bitrate: 128,
      reference_id: voiceId,
      normalize: true,
      latency: 'balanced',
      prosody: {
        speed: config.speed ?? (config.persona === 'bilge8' ? 0.85 : 1.0),
        volume: 0,
        normalize_loudness: true,
      },
      references: [],
      features: ['quality-guard'],
    });

    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/msgpack',
        model,
      },
      body: payload,
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`FishAudio TTS failed (${response.status}): ${body.slice(0, 300)}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async getAvailableVoices(): Promise<VoicePersona[]> {
    return VOICES;
  }

  estimateCost(): number {
    return 0;
  }

  async healthCheck(): Promise<VoiceHealthStatus> {
    try {
      const apiKey = this.config.get<string>('FISH_API_KEY');
      if (!apiKey) return { healthy: false, message: 'FISH_API_KEY tanimli degil' };
      const start = Date.now();
      const response = await fetch('https://api.fish.audio/model?self=true', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      return {
        healthy: response.ok,
        latencyMs: Date.now() - start,
        message: response.ok ? 'OK' : `HTTP ${response.status}`,
      };
    } catch (e) {
      return { healthy: false, message: (e as Error).message };
    }
  }

  supportsStreaming(): boolean {
    return false;
  }
}
