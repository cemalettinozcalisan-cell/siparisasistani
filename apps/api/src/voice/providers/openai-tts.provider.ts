import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { VoiceProvider, VoiceConfig, VoicePersona, VoiceHealthStatus } from './voice-provider.interface';

const VOICES: VoicePersona[] = [
  { name: 'zeynep', gender: 'female', ageGroup: '28-35', energy: 'calm', speed: 1.0, formality: 'friendly', description: 'OpenAI Nova - Sakin kadın sesi' },
  { name: 'ayse', gender: 'female', ageGroup: '25-32', energy: 'energetic', speed: 1.1, formality: 'local', description: 'OpenAI Shimmer - Sıcak kadın sesi' },
  { name: 'murat', gender: 'male', ageGroup: '35-45', energy: 'calm', speed: 0.95, formality: 'formal', description: 'OpenAI Onyx - Tok erkek sesi' },
  { name: 'mehmet', gender: 'male', ageGroup: '30-40', energy: 'normal', speed: 1.0, formality: 'local', description: 'OpenAI Echo - Doğal erkek sesi' },
];

const VOICE_MAP: Record<string, { voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' }> = {
  zeynep: { voice: 'nova' },
  ayse: { voice: 'shimmer' },
  murat: { voice: 'onyx' },
  mehmet: { voice: 'echo' },
};

@Injectable()
export class OpenAiTtsProvider implements VoiceProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiTtsProvider.name);
  private client: OpenAI;

  constructor(config: ConfigService) {
    this.client = new OpenAI({ apiKey: config.get<string>('OPENAI_API_KEY') });
  }

  async generateSpeech(text: string, config: VoiceConfig = {}): Promise<Buffer> {
    const voiceConfig = VOICE_MAP[config.persona || 'zeynep'] || VOICE_MAP['zeynep'];

    const response = await this.client.audio.speech.create({
      model: 'tts-1',
      voice: voiceConfig.voice,
      input: text,
      speed: config.speed ?? 1.0,
      response_format: 'mp3',
    });

    return Buffer.from(await response.arrayBuffer());
  }

  async getAvailableVoices(): Promise<VoicePersona[]> {
    return VOICES;
  }

  estimateCost(charCount: number): number {
    return (charCount / 1000) * 0.015;
  }

  async healthCheck(): Promise<VoiceHealthStatus> {
    try {
      const start = Date.now();
      await this.client.audio.speech.create({
        model: 'tts-1', voice: 'nova', input: 'test', speed: 1.0,
        response_format: 'mp3',
      });
      return { healthy: true, latencyMs: Date.now() - start, message: 'OK' };
    } catch (err) {
      return { healthy: false, message: (err as Error).message };
    }
  }

  supportsStreaming(): boolean {
    return false;
  }
}
