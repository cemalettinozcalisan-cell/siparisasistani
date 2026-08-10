import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { SaasService } from './saas.service';
import { TimelineService } from '../timeline/timeline.service';

@Controller('saas')
export class SaasController {
  constructor(
    private readonly saas: SaasService,
    private readonly timeline: TimelineService,
  ) {}

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
  async upgradePlan(@Param('tenantId') tenantId: string, @Body() body: { planCode: string; billingCycle?: string }) {
    const result = await this.saas.upgradePlan(tenantId, body.planCode, body.billingCycle);

    const planName = (result as any)?.plan?.name || body.planCode;
    const cycle = body.billingCycle === 'annual' ? 'Yıllık' : 'Aylık';
    await this.timeline.logEvent({
      tenantId,
      entityType: 'subscription',
      entityId: tenantId,
      eventType: 'PLAN_CHANGED',
      description: `Paket ${planName} (${cycle}) olarak değiştirildi`,
      actorType: 'STAFF',
    });

    return result;
  }

  @Post('purchase-addon/:tenantId')
  async purchaseAddon(@Param('tenantId') tenantId: string, @Body() body: { packCode: string }) {
    const result = await this.saas.purchaseAddon(tenantId, body.packCode);

    await this.timeline.logEvent({
      tenantId,
      entityType: 'subscription',
      entityId: tenantId,
      eventType: 'ADDON_PURCHASED',
      description: `${(result as any).pack || body.packCode} ek paket satın alındı`,
      actorType: 'STAFF',
    });

    return result;
  }
}
