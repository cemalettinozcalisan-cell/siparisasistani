import { Module } from '@nestjs/common';
import { AliasEngineService } from './alias-engine.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  providers: [AliasEngineService, SupabaseService],
  exports: [AliasEngineService],
})
export class AliasEngineModule {}
