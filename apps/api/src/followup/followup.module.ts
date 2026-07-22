import { Module } from '@nestjs/common';
import { FollowUpService } from './followup.service';
import { SupabaseService } from '../common/supabase.client';
import { TimelineService } from '../timeline/timeline.service';

@Module({
  providers: [FollowUpService, SupabaseService, TimelineService],
})
export class FollowUpModule {}
