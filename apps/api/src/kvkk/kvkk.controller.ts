import { Controller, Get, Delete, Param, Logger } from '@nestjs/common';
import { KvkkService } from './kvkk.service';

@Controller('kvkk')
export class KvkkController {
  private readonly logger = new Logger(KvkkController.name);

  constructor(private readonly service: KvkkService) {}

  // KVKK right to be forgotten (Madde 7)
  @Delete('erase/:tenantId/:customerId')
  async eraseCustomer(@Param('tenantId') tenantId: string, @Param('customerId') customerId: string) {
    return this.service.eraseCustomerData(tenantId, customerId);
  }

  // KVKK right to data portability (Madde 11)
  @Get('export/:tenantId/:customerId')
  async exportCustomer(@Param('tenantId') tenantId: string, @Param('customerId') customerId: string) {
    return this.service.exportCustomerData(tenantId, customerId);
  }

  // Manual trigger cleanup
  @Get('cleanup/:tenantId')
  async runCleanup(@Param('tenantId') tenantId: string) {
    // Single tenant cleanup can be triggered manually
    this.logger.log(`Manual cleanup triggered for tenant ${tenantId}`);
    return { status: 'triggered' };
  }
}
