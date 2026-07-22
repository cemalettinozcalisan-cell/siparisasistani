import { Module } from '@nestjs/common';
import { ComplaintProcessorService } from './complaint-processor.service';
import { ComplaintProcessorController } from './complaint-processor.controller';
import { SupabaseService } from '../common/supabase.client';
import { EventBusService } from '../event-bus/event-bus.service';
import { TimelineService } from '../timeline/timeline.service';

@Module({
  controllers: [ComplaintProcessorController],
  providers: [ComplaintProcessorService, SupabaseService, TimelineService, EventBusService],
  exports: [ComplaintProcessorService],
})
export class ComplaintProcessorModule {}
