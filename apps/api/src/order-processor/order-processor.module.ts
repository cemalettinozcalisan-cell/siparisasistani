import { Module } from '@nestjs/common';
import { OrderProcessorService } from './order-processor.service';
import { OrderProcessorController } from './order-processor.controller';
import { SupabaseService } from '../common/supabase.client';
import { EventBusService } from '../event-bus/event-bus.service';
import { TimelineService } from '../timeline/timeline.service';

@Module({
  controllers: [OrderProcessorController],
  providers: [OrderProcessorService, SupabaseService, EventBusService, TimelineService],
  exports: [OrderProcessorService],
})
export class OrderProcessorModule {}
