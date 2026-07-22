import { Module } from '@nestjs/common';
import { ReplayController } from './replay.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [ReplayController],
  providers: [SupabaseService],
})
export class ReplayModule {}
