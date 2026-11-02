import { Module } from '@nestjs/common';
import { OrderProcessorService } from './order-processor.service';
import { OrderProcessorController } from './order-processor.controller';
import { SupabaseService } from '../common/supabase.client';
import { TimelineService } from '../timeline/timeline.service';

@Module({
  controllers: [OrderProcessorController],
  // EventBusService @Global EventBusModule'dan gelir (burada tekrar provider YAPMA → ayrı instance olur)
  providers: [OrderProcessorService, SupabaseService, TimelineService],
  exports: [OrderProcessorService],
})
export class OrderProcessorModule {}
