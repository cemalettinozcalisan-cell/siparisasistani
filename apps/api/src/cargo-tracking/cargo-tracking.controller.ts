import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { CargoTrackingService } from './cargo-tracking.service';

@Controller('cargo')
export class CargoTrackingController {
  constructor(private readonly service: CargoTrackingService) {}

  @Get('integrations/:tenantId')
  async getIntegrations(@Param('tenantId') tenantId: string) {
    return this.service.getIntegrations(tenantId);
  }

  @Post('integrations/:tenantId/:company')
  async saveIntegration(
    @Param('tenantId') tenantId: string,
    @Param('company') company: string,
    @Body() body: { enabled?: boolean; api_key?: string; api_secret?: string; extra_config?: Record<string, unknown> },
  ) {
    await this.service.saveIntegration(tenantId, company, body);
    return { success: true };
  }

  @Post('integrations/:tenantId/:company/test')
  async testIntegration(@Param('tenantId') tenantId: string, @Param('company') company: string) {
    return this.service.testIntegration(tenantId, company);
  }

  @Post('integrations/:tenantId/:company/default')
  async setDefault(@Param('tenantId') tenantId: string, @Param('company') company: string) {
    await this.service.setDefaultCargoCompany(tenantId, company);
    return { success: true, default_company: company };
  }

  @Post('shipments/:tenantId/:orderId')
  async createShipment(@Param('tenantId') tenantId: string, @Param('orderId') orderId: string, @Body() body: { company?: string }) {
    return this.service.createShipment(tenantId, orderId, body?.company);
  }

  @Post('check/:tenantId/:company')
  async checkStatus(@Param('tenantId') tenantId: string, @Param('company') company: string, @Body() body: { trackingNumber: string }) {
    if (!body?.trackingNumber) return { error: 'trackingNumber parametresi gerekli' };
    const adapter = this.service.getAdapter(company);
    if (!adapter) return { error: 'Firma tanınmıyor' };
    if (!(await adapter.isConfigured(tenantId))) {
      return { status: 'unknown', description: 'Entegrasyon tanımlı değil' };
    }
    return adapter.checkStatus(tenantId, body.trackingNumber);
  }
}
