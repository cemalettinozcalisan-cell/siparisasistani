import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(TenantGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Roles('owner', 'manager')
  @Get(':tenantId')
  async list(@Param('tenantId') tenantId: string) {
    return this.campaigns.list(tenantId);
  }

  @Roles('owner', 'manager')
  @Post(':tenantId')
  async create(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    return this.campaigns.create(tenantId, body);
  }

  @Roles('owner', 'manager')
  @Get(':tenantId/active')
  async active(@Param('tenantId') tenantId: string) {
    return this.campaigns.getActiveCampaigns(tenantId);
  }

  @Roles('owner', 'manager')
  @Put(':tenantId/:id')
  async update(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.campaigns.updateCampaign(tenantId, id, body);
  }

  @Roles('owner', 'manager')
  @Delete(':tenantId/:id')
  async remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.campaigns.delete(tenantId, id);
  }
}
