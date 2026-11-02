import { Module } from '@nestjs/common';
import { OrderEngineService } from './order-engine.service';
import { OrderEngineController } from './order-engine.controller';
import { SupabaseService } from '../common/supabase.client';
import { WhatsAppConversationsService } from '../whatsapp/conversations/conversations.service';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [MessagesModule],
  controllers: [OrderEngineController],
  // EventBusService @Global EventBusModule'dan gelir (burada tekrar provider YAPMA → ayrı instance olur)
  providers: [OrderEngineService, SupabaseService, WhatsAppConversationsService],
  exports: [OrderEngineService],
})
export class OrderEngineModule {}
