import { Module } from '@nestjs/common';
import { AiTestController } from './ai-test.controller';
import { AiModule } from '../ai/ai.module';
import { AiParserService } from '../ai/conversation/parser/ai-parser';
import { SupabaseService } from '../common/supabase.client';
import { PromptVersionService } from './prompt-version.service';

@Module({
  imports: [AiModule],
  controllers: [AiTestController],
  providers: [AiParserService, PromptVersionService, SupabaseService],
  exports: [PromptVersionService],
})
export class AiTestModule {}
