import { Module, Global } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookDedupService } from './webhook-dedup.service';
import { SupabaseService } from '../common/supabase.client';

@Global()
@Module({
  controllers: [WebhookController],
  providers: [WebhookService, WebhookDedupService, SupabaseService],
  exports: [WebhookService, WebhookDedupService],
})
export class WebhookModule {}
