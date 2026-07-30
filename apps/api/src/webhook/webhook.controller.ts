import { Controller, Post, Param, Body, Logger } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly service: WebhookService) {}

  // WooCommerce webhook
  @Post('woocommerce/:tenantId')
  async woocommerce(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    return this.service.receiveOrder(tenantId, 'woocommerce', body);
  }

  // Shopify webhook
  @Post('shopify/:tenantId')
  async shopify(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    return this.service.receiveOrder(tenantId, 'shopify', body);
  }

  // Ideasoft webhook
  @Post('ideasoft/:tenantId')
  async ideasoft(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    return this.service.receiveOrder(tenantId, 'ideasoft', body);
  }

  // Ticimax webhook
  @Post('ticimax/:tenantId')
  async ticimax(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    return this.service.receiveOrder(tenantId, 'ticimax', body);
  }

  // Custom webhook (generic)
  @Post('custom/:tenantId')
  async custom(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    return this.service.receiveOrder(tenantId, 'custom', body);
  }
}
