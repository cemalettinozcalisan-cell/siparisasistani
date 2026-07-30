import { Controller, Get, Param, Logger } from '@nestjs/common';
import { QueueMonitorService } from './queue-monitor.service';

@Controller('queue-monitor')
export class QueueMonitorController {
  private readonly logger = new Logger(QueueMonitorController.name);

  constructor(private readonly service: QueueMonitorService) {}

  @Get()
  async getAll() {
    return this.service.getQueueStats();
  }

  @Get(':tenantId')
  async getByTenant(@Param('tenantId') tenantId: string) {
    return this.service.getQueueStats(tenantId);
  }
}
