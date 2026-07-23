import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { SaasService } from './saas.service';

@Controller('saas')
export class SaasController {
  constructor(private readonly saas: SaasService) {}

  @Get('plans')
  async getPlans() { return this.saas.getPlans(); }

  @Get('addons')
  async getAddons() { return this.saas.getAddonPacks(); }

  @Get('subscription/:tenantId')
  async getSubscription(@Param('tenantId') tenantId: string) { return this.saas.getSubscription(tenantId); }

  @Get('usage/:tenantId')
  async getUsage(@Param('tenantId') tenantId: string) { return this.saas.getUsage(tenantId); }

  @Get('invoices/:tenantId')
  async getInvoices(@Param('tenantId') tenantId: string) { return this.saas.getInvoices(tenantId); }

  @Post('upgrade/:tenantId')
  async upgradePlan(@Param('tenantId') tenantId: string, @Body() body: { planCode: string }) {
    return this.saas.upgradePlan(tenantId, body.planCode);
  }

  @Post('purchase-addon/:tenantId')
  async purchaseAddon(@Param('tenantId') tenantId: string, @Body() body: { packCode: string }) {
    return this.saas.purchaseAddon(tenantId, body.packCode);
  }
}
