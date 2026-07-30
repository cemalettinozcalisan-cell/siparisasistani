import { Controller, Get, Post, Put, Delete, Param, Body, Logger } from '@nestjs/common';
import { SalesEngineService } from './sales-engine.service';

@Controller('sales-engine')
export class SalesEngineController {
  private readonly logger = new Logger(SalesEngineController.name);

  constructor(private readonly service: SalesEngineService) {}

  @Get('campaigns/:tenantId')
  async listCampaigns(@Param('tenantId') tenantId: string) {
    return this.service.listCampaigns(tenantId);
  }

  @Post('campaigns/:tenantId')
  async createCampaign(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    return this.service.createCampaign(tenantId, body);
  }

  @Put('campaigns/:tenantId/:id')
  async updateCampaign(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.updateCampaign(id, body);
  }

  @Delete('campaigns/:tenantId/:id')
  async deleteCampaign(@Param('id') id: string) {
    return this.service.deleteCampaign(id);
  }

  @Get('stats/:tenantId')
  async getStats(@Param('tenantId') tenantId: string) {
    return this.service.getStats(tenantId);
  }

  @Post('trigger/:tenantId')
  async triggerAutomation(@Param('tenantId') tenantId: string) {
    this.logger.log(`Manual automation trigger for tenant ${tenantId}`);
    await this.service.dailyAutomation();
    return { status: 'triggered' };
  }
}
