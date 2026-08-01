import { Controller, Get, Post, Put, Delete, Param, Body, Logger, UseGuards } from '@nestjs/common';
import { SalesEngineService } from './sales-engine.service';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(TenantGuard)
@Controller('sales-engine')
export class SalesEngineController {
  private readonly logger = new Logger(SalesEngineController.name);

  constructor(private readonly service: SalesEngineService) {}

  @Roles('owner', 'manager')
  @Get('campaigns/:tenantId')
  async listCampaigns(@Param('tenantId') tenantId: string) {
    return this.service.listCampaigns(tenantId);
  }

  @Roles('owner', 'manager')
  @Post('campaigns/:tenantId')
  async createCampaign(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    return this.service.createCampaign(tenantId, body);
  }

  @Roles('owner', 'manager')
  @Put('campaigns/:tenantId/:id')
  async updateCampaign(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.updateCampaign(id, body);
  }

  @Roles('owner', 'manager')
  @Delete('campaigns/:tenantId/:id')
  async deleteCampaign(@Param('id') id: string) {
    return this.service.deleteCampaign(id);
  }

  @Roles('owner', 'manager')
  @Get('stats/:tenantId')
  async getStats(@Param('tenantId') tenantId: string) {
    return this.service.getStats(tenantId);
  }

  @Roles('owner', 'manager')
  @Post('trigger/:tenantId')
  async triggerAutomation(@Param('tenantId') tenantId: string) {
    this.logger.log(`Manual automation trigger for tenant ${tenantId}`);
    await this.service.dailyAutomation();
    return { status: 'triggered' };
  }
}
