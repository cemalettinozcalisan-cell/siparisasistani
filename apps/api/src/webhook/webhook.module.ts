import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [WebhookController],
  providers: [WebhookService, SupabaseService],
  exports: [WebhookService],
})
export class WebhookModule {}
