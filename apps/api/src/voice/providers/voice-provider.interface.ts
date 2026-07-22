export interface VoicePersona {
  name: string;
  gender: 'female' | 'male';
  ageGroup?: string;
  energy?: 'calm' | 'normal' | 'energetic';
  speed?: number;
  accent?: string;
  formality?: 'formal' | 'friendly' | 'local';
  description?: string;
}

export interface VoiceConfig {
  persona?: string;
  speed?: number;
  stability?: number;
  style?: number;
  similarity?: number;
  pitch?: number;
  language?: string;
}

export interface VoiceHealthStatus {
  healthy: boolean;
  latencyMs?: number;
  message?: string;
}

export interface VoiceProvider {
  readonly name: string;
  generateSpeech(text: string, config: VoiceConfig): Promise<Buffer>;
  getAvailableVoices(): Promise<VoicePersona[]>;
  estimateCost(charCount: number): number;
  healthCheck(): Promise<VoiceHealthStatus>;
  supportsStreaming(): boolean;
}

export class GenerateSpeechDto {
  text = '';
  tenantId?: string;
  config?: VoiceConfig;
}
