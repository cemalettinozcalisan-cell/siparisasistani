import { Module } from '@nestjs/common';
import { InstagramController } from './instagram.controller';
import { InstagramService } from './instagram.service';
import { SupabaseService } from '../common/supabase.client';
import { AiBrainModule } from '../ai/brain/ai-brain.module';

@Module({
  imports: [AiBrainModule],
  controllers: [InstagramController],
  providers: [InstagramService, SupabaseService],
  exports: [InstagramService],
})
export class InstagramModule {}
