import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get(':tenantId')
  async list(@Param('tenantId') tenantId: string) {
    return this.campaigns.list(tenantId);
  }

  @Post(':tenantId')
  async create(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    return this.campaigns.create(tenantId, body);
  }

  @Get(':tenantId/active')
  async active(@Param('tenantId') tenantId: string) {
    return this.campaigns.getActiveCampaigns(tenantId);
  }

  @Put(':tenantId/:id')
  async update(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.campaigns.updateCampaign(tenantId, id, body);
  }
}
