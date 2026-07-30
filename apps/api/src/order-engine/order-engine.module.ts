import { Module } from '@nestjs/common';
import { OrderEngineService } from './order-engine.service';
import { OrderEngineController } from './order-engine.controller';
import { SupabaseService } from '../common/supabase.client';
import { EventBusService } from '../event-bus/event-bus.service';
import { WhatsAppConversationsService } from '../whatsapp/conversations/conversations.service';

@Module({
  controllers: [OrderEngineController],
  providers: [OrderEngineService, SupabaseService, EventBusService, WhatsAppConversationsService],
  exports: [OrderEngineService],
})
export class OrderEngineModule {}
