import { Module } from '@nestjs/common';
import { QueueMonitorController } from './queue-monitor.controller';
import { QueueMonitorService } from './queue-monitor.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [QueueMonitorController],
  providers: [QueueMonitorService, SupabaseService],
})
export class QueueMonitorModule {}
