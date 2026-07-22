import { Module } from '@nestjs/common';
import { CallSessionsService } from './call-sessions.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  providers: [CallSessionsService, SupabaseService],
  exports: [CallSessionsService],
})
export class CallSessionsModule {}
