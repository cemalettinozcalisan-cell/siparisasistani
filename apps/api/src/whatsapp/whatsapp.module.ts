import { Module } from '@nestjs/common';
import { WhatsAppConversationsService } from './conversations/conversations.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  providers: [WhatsAppConversationsService, SupabaseService],
  exports: [WhatsAppConversationsService],
})
export class WhatsAppModule {}
