import { Module } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { WhatsappTemplatesService } from './whatsapp-templates.service';
import { WhatsappTemplatesController } from './whatsapp-templates.controller';
import { MetaWhatsappProvider } from '../messages/providers/meta-whatsapp.provider';

@Module({
  controllers: [WhatsappTemplatesController],
  providers: [WhatsappTemplatesService, MetaWhatsappProvider, SupabaseService],
  exports: [WhatsappTemplatesService],
})
export class WhatsappTemplatesModule {}
