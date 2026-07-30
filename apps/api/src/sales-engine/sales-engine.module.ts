import { Module } from '@nestjs/common';
import { SalesEngineService } from './sales-engine.service';
import { SalesEngineController } from './sales-engine.controller';
import { SupabaseService } from '../common/supabase.client';
import { WhatsAppConversationsService } from '../whatsapp/conversations/conversations.service';
import { InstagramService } from '../instagram/instagram.service';

@Module({
  controllers: [SalesEngineController],
  providers: [SalesEngineService, SupabaseService, WhatsAppConversationsService, InstagramService],
  exports: [SalesEngineService],
})
export class SalesEngineModule {}
