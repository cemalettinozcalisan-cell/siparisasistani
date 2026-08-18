import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { IysService } from './iys.service';

@Controller('iys')
export class IysController {
  constructor(private readonly service: IysService) {}

  @Get(':tenantId/check')
  async check(@Param('tenantId') tenantId: string, @Query('phone') phone: string) {
    if (!phone) return { error: 'phone parametresi gerekli' };
    return this.service.checkConsent(tenantId, phone);
  }

  @Post(':tenantId/opt-out')
  async optOut(@Param('tenantId') tenantId: string, @Body() body: { phone: string; channel?: string; source?: string }) {
    await this.service.recordOptOut(tenantId, body.phone, body.channel, body.source);
    return { success: true };
  }

  @Get(':tenantId/status')
  async status(@Param('tenantId') tenantId: string) {
    return { configured: await this.service.isConfigured(tenantId) };
  }
}
