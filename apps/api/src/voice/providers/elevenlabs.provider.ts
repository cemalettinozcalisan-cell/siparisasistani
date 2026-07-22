import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoiceProvider, VoiceConfig, VoicePersona, VoiceHealthStatus } from './voice-provider.interface';

const VOICES: VoicePersona[] = [
  { name: 'zeynep', gender: 'female', ageGroup: '30-35', energy: 'calm', speed: 1.0, formality: 'friendly', description: 'Sakin, profesyonel kadın sesi' },
  { name: 'ayse', gender: 'female', ageGroup: '28-32', energy: 'energetic', speed: 1.1, formality: 'local', description: 'Sıcak, samimi kadın sesi, yöresel' },
  { name: 'murat', gender: 'male', ageGroup: '40-45', energy: 'calm', speed: 0.95, formality: 'formal', description: 'Güven veren tok ses, resmi' },
  { name: 'mehmet', gender: 'male', ageGroup: '35-40', energy: 'normal', speed: 1.0, formality: 'local', description: 'Esnaf, doğal erkek sesi' },
];

const VOICE_MAP: Record<string, { voice_id: string }> = {
  zeynep: { voice_id: '21m00Tcm4TlvDq8ikWAM' },
  ayse: { voice_id: 'AZnzlk1XvdvUeBnXmlld' },
  murat: { voice_id: 'EXAVITQu4vr2jL3o1s4j' },
  mehmet: { voice_id: 'TxGEqnHWrfWFTfGW9XjX' },
};

@Injectable()
export class ElevenLabsProvider implements VoiceProvider {
  readonly name = 'elevenlabs';
  private readonly logger = new Logger(ElevenLabsProvider.name);
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('ELEVENLABS_API_KEY', '');
  }

  async generateSpeech(text: string, config: VoiceConfig = {}): Promise<Buffer> {
    const voice = VOICE_MAP[config.persona || 'zeynep'] || VOICE_MAP['zeynep'];

    const response = await fetch(`${this.baseUrl}/text-to-speech/${voice.voice_id}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': this.apiKey },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: config.stability ?? 0.5,
          similarity_boost: config.similarity ?? 0.75,
          style: config.style ?? 0.5,
          speed: config.speed ?? 1.0,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`ElevenLabs TTS failed (${response.status}): ${err}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async getAvailableVoices(): Promise<VoicePersona[]> {
    return VOICES;
  }

  estimateCost(charCount: number): number {
    return (charCount / 1000) * 0.22;
  }

  async healthCheck(): Promise<VoiceHealthStatus> {
    try {
      const start = Date.now();
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: { 'xi-api-key': this.apiKey },
      });
      return {
        healthy: response.ok,
        latencyMs: Date.now() - start,
        message: response.ok ? 'OK' : `HTTP ${response.status}`,
      };
    } catch (err) {
      return { healthy: false, message: (err as Error).message };
    }
  }

  supportsStreaming(): boolean {
    return true;
  }
}
