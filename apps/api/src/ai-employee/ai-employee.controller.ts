import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import { AiEmployeeService, AiEmployeeConfig } from './ai-employee.service';

@UseGuards(TenantGuard)
@Controller('ai-employee')
export class AiEmployeeController {
  constructor(private readonly service: AiEmployeeService) {}

  @Roles('owner', 'manager')
  @Get(':tenantId')
  async get(@Param('tenantId') tenantId: string): Promise<AiEmployeeConfig> {
    return this.service.get(tenantId);
  }

  @Roles('owner', 'manager')
  @Put(':tenantId')
  async update(@Param('tenantId') tenantId: string, @Body() body: Partial<AiEmployeeConfig>): Promise<AiEmployeeConfig> {
    return this.service.update(tenantId, body);
  }
}