import { Module } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogController } from './activity-log.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [ActivityLogController],
  providers: [ActivityLogService, SupabaseService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
