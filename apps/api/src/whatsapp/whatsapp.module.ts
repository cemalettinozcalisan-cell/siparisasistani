import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsAppConversationsService } from './conversations/conversations.service';
import { SupabaseService } from '../common/supabase.client';
import { AiBrainModule } from '../ai/brain/ai-brain.module';
import { MetaWhatsappProvider } from '../messages/providers/meta-whatsapp.provider';

@Module({
  imports: [AiBrainModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsAppConversationsService, MetaWhatsappProvider, SupabaseService],
  exports: [WhatsappService, WhatsAppConversationsService],
})
export class WhatsAppModule {}
