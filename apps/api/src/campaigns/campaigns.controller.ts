import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { TimelineService } from '../timeline/timeline.service';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(TenantGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly campaigns: CampaignsService,
    private readonly timeline: TimelineService,
  ) {}

  @Roles('owner', 'manager')
  @Get(':tenantId')
  async list(@Param('tenantId') tenantId: string) {
    return this.campaigns.list(tenantId);
  }

  @Roles('owner', 'manager')
  @Post(':tenantId')
  async create(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    const result = await this.campaigns.create(tenantId, body);
    await this.timeline.logEvent({
      tenantId, entityType: 'campaign', entityId: (result as any)?.id,
      eventType: 'CAMPAIGN_CREATED',
      description: `${body.title || 'Kampanya'} oluşturuldu`,
      actorType: 'STAFF',
    });
    return result;
  }

  @Roles('owner', 'manager')
  @Get(':tenantId/active')
  async active(@Param('tenantId') tenantId: string) {
    return this.campaigns.getActiveCampaigns(tenantId);
  }

  @Roles('owner', 'manager')
  @Put(':tenantId/:id')
  async update(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const result = await this.campaigns.updateCampaign(tenantId, id, body);
    await this.timeline.logEvent({
      tenantId, entityType: 'campaign', entityId: id,
      eventType: 'CAMPAIGN_UPDATED',
      description: `${body.title || 'Kampanya'} güncellendi`,
      actorType: 'STAFF',
    });
    return result;
  }

  @Roles('owner', 'manager')
  @Delete(':tenantId/:id')
  async remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    const result = await this.campaigns.delete(tenantId, id);
    await this.timeline.logEvent({
      tenantId, entityType: 'campaign', entityId: id,
      eventType: 'CAMPAIGN_DELETED',
      description: 'Kampanya silindi',
      actorType: 'STAFF',
    });
    return result;
  }
}
