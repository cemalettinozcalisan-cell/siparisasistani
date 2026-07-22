import { Module } from '@nestjs/common';
import { OrdersListController } from './orders-list.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [OrdersListController],
  providers: [SupabaseService],
})
export class OrdersListModule {}
