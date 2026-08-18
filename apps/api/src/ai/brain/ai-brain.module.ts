import { Module } from '@nestjs/common';
import { AiBrainService } from './ai-brain.service';
import { AiParserService } from '../conversation/parser/ai-parser';
import { OrderValidatorService } from '../conversation/validator/validator';
import { AiModule } from '../ai.module';
import { OrderEngineModule } from '../../order-engine/order-engine.module';
import { ComplaintProcessorModule } from '../../complaint-processor/complaint-processor.module';
import { SupabaseService } from '../../common/supabase.client';
import { ConversationController } from './conversation.controller';

@Module({
  imports: [AiModule, OrderEngineModule, ComplaintProcessorModule],
  controllers: [ConversationController],
  providers: [AiBrainService, AiParserService, OrderValidatorService, SupabaseService],
  exports: [AiBrainService],
})
export class AiBrainModule {}
