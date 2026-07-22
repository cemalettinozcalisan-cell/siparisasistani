import { Module } from '@nestjs/common';
import { OrderItemsController } from './order-items.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [OrderItemsController],
  providers: [SupabaseService],
})
export class OrderItemsModule {}
