import { Module } from '@nestjs/common';
import { OrderLockService } from './order-lock.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  providers: [OrderLockService, SupabaseService],
  exports: [OrderLockService],
})
export class OrderLockModule {}
