import { Module } from '@nestjs/common';
import { ComplaintProcessorService } from './complaint-processor.service';
import { ComplaintProcessorController } from './complaint-processor.controller';
import { SupabaseService } from '../common/supabase.client';
import { TimelineService } from '../timeline/timeline.service';

@Module({
  controllers: [ComplaintProcessorController],
  // EventBusService @Global EventBusModule'dan gelir (burada tekrar provider YAPMA → ayrı instance olur)
  providers: [ComplaintProcessorService, SupabaseService, TimelineService],
  exports: [ComplaintProcessorService],
})
export class ComplaintProcessorModule {}
