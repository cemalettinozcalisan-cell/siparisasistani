import { Module } from '@nestjs/common';
import { PrintQueueService } from './print-queue.service';
import { PrintFormatService } from './print-format.service';
import { PrintPreviewController } from './print-preview.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [PrintPreviewController],
  providers: [PrintQueueService, PrintFormatService, SupabaseService],
  exports: [PrintQueueService, PrintFormatService],
})
export class PrintQueueModule {}
