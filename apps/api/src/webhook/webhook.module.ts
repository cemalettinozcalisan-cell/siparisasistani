import { Module, Global } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookDedupService } from './webhook-dedup.service';
import { SupabaseService } from '../common/supabase.client';
import { OrderEngineModule } from '../order-engine/order-engine.module';

@Global()
@Module({
  imports: [OrderEngineModule],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookDedupService, SupabaseService],
  exports: [WebhookService, WebhookDedupService],
})
export class WebhookModule {}
