import { Module } from '@nestjs/common';
import { OrdersListController } from './orders-list.controller';
import { SupabaseService } from '../common/supabase.client';
import { EventBusModule } from '../event-bus/event-bus.module';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [EventBusModule, TimelineModule],
  controllers: [OrdersListController],
  providers: [SupabaseService],
})
export class OrdersListModule {}
