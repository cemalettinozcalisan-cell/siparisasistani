import { Module } from '@nestjs/common';
import { ClarificationService } from './clarification.service';
import { AliasEngineModule } from '../alias-engine/alias-engine.module';
import { SupabaseService } from '../common/supabase.client';

@Module({
  imports: [AliasEngineModule],
  providers: [ClarificationService, SupabaseService],
  exports: [ClarificationService],
})
export class ClarificationModule {}
