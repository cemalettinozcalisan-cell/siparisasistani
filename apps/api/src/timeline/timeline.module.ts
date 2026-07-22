import { Module } from '@nestjs/common';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [TimelineController],
  providers: [TimelineService, SupabaseService],
  exports: [TimelineService],
})
export class TimelineModule {}
