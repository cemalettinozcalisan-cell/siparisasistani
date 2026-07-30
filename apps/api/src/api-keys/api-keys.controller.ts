import { Controller, Get, Post, Delete, Param, Body, Logger } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';

@Controller('api-keys')
export class ApiKeysController {
  private readonly logger = new Logger(ApiKeysController.name);

  constructor(private readonly service: ApiKeysService) {}

  @Get(':tenantId')
  async list(@Param('tenantId') tenantId: string) {
    return this.service.list(tenantId);
  }

  @Post(':tenantId/:provider')
  async upsert(
    @Param('tenantId') tenantId: string,
    @Param('provider') provider: string,
    @Body() body: { label?: string; api_key?: string; api_secret?: string; extra_config?: Record<string, unknown> },
  ) {
    return this.service.upsert(tenantId, provider, body);
  }

  @Post(':tenantId/:provider/test')
  async test(@Param('tenantId') tenantId: string, @Param('provider') provider: string) {
    return this.service.test(tenantId, provider);
  }

  @Delete(':tenantId/:provider')
  async remove(@Param('tenantId') tenantId: string, @Param('provider') provider: string) {
    return this.service.remove(tenantId, provider);
  }
}
