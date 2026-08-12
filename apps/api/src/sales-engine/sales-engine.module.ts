import { Module } from '@nestjs/common';
import { SalesEngineService } from './sales-engine.service';
import { SalesEngineController } from './sales-engine.controller';
import { SupabaseService } from '../common/supabase.client';
import { WhatsAppConversationsService } from '../whatsapp/conversations/conversations.service';
import { InstagramService } from '../instagram/instagram.service';
import { AiBrainModule } from '../ai/brain/ai-brain.module';

@Module({
  imports: [AiBrainModule],
  controllers: [SalesEngineController],
  providers: [SalesEngineService, SupabaseService, WhatsAppConversationsService, InstagramService],
  exports: [SalesEngineService],
})
export class SalesEngineModule {}
