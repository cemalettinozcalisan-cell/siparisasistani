import { Module } from '@nestjs/common';
import { AiProviderFactory } from './providers/ai-provider.factory';
import { ConversationService } from './conversation/flows/conversation.flow';
import { AiParserService } from './conversation/parser/ai-parser';
import { PromptEngineModule } from './prompt-engine/prompt-engine.module';
import { AiAuditModule } from './audit/ai-audit.module';
import { BusinessKnowledgeService } from './business-knowledge/business-knowledge.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  imports: [PromptEngineModule, AiAuditModule],
  providers: [
    AiProviderFactory,
    ConversationService,
    AiParserService,
    BusinessKnowledgeService,
    SupabaseService,
  ],
  exports: [ConversationService, AiProviderFactory, PromptEngineModule, AiAuditModule],
})
export class AiModule {}
