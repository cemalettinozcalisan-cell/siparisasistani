import { Controller, Post, Param, Body, Logger } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookDedupService } from './webhook-dedup.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly service: WebhookService,
    private readonly dedup: WebhookDedupService,
  ) {}

  // WooCommerce webhook
  @Post('woocommerce/:tenantId')
  async woocommerce(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    return this.receiveIdempotent(tenantId, 'woocommerce', String(body.id || body.number || ''), body);
  }

  // Shopify webhook
  @Post('shopify/:tenantId')
  async shopify(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    return this.receiveIdempotent(tenantId, 'shopify', String(body.id || ''), body);
  }

  // Ideasoft webhook
  @Post('ideasoft/:tenantId')
  async ideasoft(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    return this.receiveIdempotent(tenantId, 'ideasoft', String(body.id || body.order_id || ''), body);
  }

  // Ticimax webhook
  @Post('ticimax/:tenantId')
  async ticimax(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    return this.receiveIdempotent(tenantId, 'ticimax', String(body.id || body.order_id || ''), body);
  }

  // Custom webhook (generic)
  @Post('custom/:tenantId')
  async custom(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    return this.receiveIdempotent(tenantId, 'custom', String(body.id || body.order_number || ''), body);
  }

  /** Idempotent alım: aynı event ID tekrar gelirse duplicate döner, çift sipariş engellenir. */
  private async receiveIdempotent(
    tenantId: string,
    provider: string,
    eventId: string,
    body: Record<string, unknown>,
  ) {
    const isDuplicate = await this.dedup.claim(tenantId, provider, eventId);
    if (isDuplicate) {
      this.logger.log(`[${provider}] duplicate webhook ${eventId} ignored`);
      return { status: 'duplicate', order_number: body.order_number || null };
    }
    const result = await this.service.receiveOrder(tenantId, provider, body);
    this.logger.log(`[${provider}] webhook ${eventId} processed for tenant ${tenantId}`);
    return result;
  }
}
