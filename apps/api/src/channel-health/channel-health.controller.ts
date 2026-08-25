import { Controller, Get, Param } from '@nestjs/common';
import { ChannelHealthService } from './channel-health.service';

@Controller('channel-health')
export class ChannelHealthController {
  constructor(private readonly service: ChannelHealthService) {}

  /** Per-tenant kanal sağlık özeti — admin "Sistem Durumu" / esnaf destek teşhisi için */
  @Get('tenant/:tenantId')
  async tenantHealth(@Param('tenantId') tenantId: string) {
    return this.service.getTenantHealth(tenantId);
  }
}
