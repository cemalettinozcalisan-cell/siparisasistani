import { Module } from '@nestjs/common';
import { WhatsAppMessagesController } from './whatsapp-messages.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [WhatsAppMessagesController],
  providers: [SupabaseService],
})
export class WhatsAppMessagesModule {}
