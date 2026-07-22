import { Module } from '@nestjs/common';
import { PrintQueueService } from './print-queue.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  providers: [PrintQueueService, SupabaseService],
  exports: [PrintQueueService],
})
export class PrintQueueModule {}
