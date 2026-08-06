import { Module } from '@nestjs/common';
import { OrdersListController } from './orders-list.controller';
import { SupabaseService } from '../common/supabase.client';
import { EventBusModule } from '../event-bus/event-bus.module';

@Module({
  imports: [EventBusModule],
  controllers: [OrdersListController],
  providers: [SupabaseService],
})
export class OrdersListModule {}
