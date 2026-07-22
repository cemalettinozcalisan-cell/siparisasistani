import { Module } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  providers: [ActivityLogService, SupabaseService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
