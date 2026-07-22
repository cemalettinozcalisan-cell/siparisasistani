import { Module } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { VoiceProviderFactory } from './providers/provider.factory';
import { TextNormalizer } from './utils/text-normalizer';
import { SsmlBuilder } from './utils/ssml-builder';
import { SplitEngine } from './utils/split-engine';
import { VoiceCacheService } from './cache/voice-cache.service';
import { SupabaseService } from '../common/supabase.client';
import { VoiceController } from './voice.controller';

@Module({
  controllers: [VoiceController],
  providers: [
    VoiceService,
    VoiceProviderFactory,
    TextNormalizer,
    SsmlBuilder,
    SplitEngine,
    VoiceCacheService,
    SupabaseService,
  ],
  exports: [VoiceService],
})
export class VoiceModule {}
