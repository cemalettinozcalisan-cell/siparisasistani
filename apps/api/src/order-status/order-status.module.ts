import { Module } from '@nestjs/common';
import { OrderStatusService } from './order-status.service';
import { OrderStatusController } from './order-status.controller';
import { SupabaseService } from '../common/supabase.client';
import { TimelineService } from '../timeline/timeline.service';

@Module({
  controllers: [OrderStatusController],
  providers: [OrderStatusService, SupabaseService, TimelineService],
})
export class OrderStatusModule {}
