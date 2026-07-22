import { Controller, Post, Get, Param, Body, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { VoiceService } from './voice.service';
import { VoiceProviderFactory } from './providers/provider.factory';

@Controller('voice')
export class VoiceController {
  constructor(
    private readonly voice: VoiceService,
    private readonly factory: VoiceProviderFactory,
  ) {}

  @Post('speak')
  async speak(@Body() body: { text: string; tenantId?: string }, @Res() res: Response) {
    const result = await this.voice.generateSpeech(body.text, body.tenantId);
    res.set({
      'Content-Type': 'audio/mpeg',
      'X-Voice-Provider': result.provider,
      'X-Voice-Persona': result.persona,
      'X-Voice-Cached': String(result.cached),
    });
    res.send(result.audio);
  }

  @Post('speak-batch')
  async speakBatch(@Body() body: { text: string; tenantId?: string }) {
    const result = await this.voice.generateSpeechBatch(body.text, body.tenantId);
    return {
      fragmentCount: result.fragments.length,
      fragments: result.fragments.map((f) => ({
        index: f.index, text: f.text, estimatedMs: f.estimatedDurationMs,
      })),
      totalAudioBytes: result.audioBuffers.reduce((s, b) => s + b.length, 0),
      provider: result.provider,
      persona: result.persona,
    };
  }

  @Post('preview')
  async preview(@Body() body: { text: string; persona: string; provider: string }, @Res() res: Response) {
    const audio = await this.voice.previewVoice(body.text, body.persona, body.provider);
    res.set({ 'Content-Type': 'audio/mpeg' });
    res.send(audio);
  }

  @Post('test')
  async testVoice(@Body() body: { tenantId?: string }, @Res() res: Response) {
    const testText = 'Merhaba. Sipariş hattımıza hoş geldiniz. Size nasıl yardımcı olabilirim?';
    const result = await this.voice.generateSpeech(testText, body.tenantId);
    res.set({
      'Content-Type': 'audio/mpeg',
      'X-Voice-Provider': result.provider,
      'X-Voice-Persona': result.persona,
    });
    res.send(result.audio);
  }

  @Get('health')
  async health() {
    return this.factory.healthCheckAll();
  }

  @Get('voices')
  async listVoices(@Query('provider') provider?: string) {
    const p = provider || 'elevenlabs';
    const prov = this.factory.getProvider(p);
    return prov.getAvailableVoices();
  }

  @Get('providers')
  async listProviders() {
    return this.factory.listProviders();
  }
}
