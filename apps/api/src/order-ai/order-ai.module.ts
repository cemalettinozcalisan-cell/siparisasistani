import { Module } from '@nestjs/common';
import { OrderAiToolsService } from './order-ai-tools.service';
import { OrderAiDevController } from './order-ai-dev.controller';
import { OrderAiPreviewController } from './order-ai-preview.controller';
import { OrderAiAgentController } from './order-ai-agent.controller';
import { OrderAiVoicePreviewService } from './order-ai-voice-preview.service';
import { OrderAiGateway } from './order-ai.gateway';
import { OrderEngineModule } from '../order-engine/order-engine.module';
import { PromptEngineModule } from '../ai/prompt-engine/prompt-engine.module';
import { MessagesModule } from '../messages/messages.module';
import { ComplaintProcessorModule } from '../complaint-processor/complaint-processor.module';
import { OrderValidatorService } from '../ai/conversation/validator/validator';
import { SupabaseService } from '../common/supabase.client';

/**
 * Sipariş AI (İZOLE modül). Mevcut ai-employee/AiBrain modüllerine dokunmaz.
 * F0: granular araçlar + geçici dev ucu. F1: Gemini Live realtime gateway. P64: ses önizleme. P90: WhatsApp (send_payment_info).
 * AuthService @Global olduğu için ayrıca import gerekmez.
 */
@Module({
  imports: [OrderEngineModule, PromptEngineModule, MessagesModule, ComplaintProcessorModule],
  controllers: [OrderAiDevController, OrderAiPreviewController, OrderAiAgentController],
  providers: [OrderAiToolsService, OrderAiGateway, OrderAiVoicePreviewService, OrderValidatorService, SupabaseService],
  exports: [OrderAiToolsService],
})
export class OrderAiModule {}
