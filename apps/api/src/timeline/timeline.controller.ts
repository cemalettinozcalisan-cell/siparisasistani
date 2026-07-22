import { Controller, Get, Param, Query } from '@nestjs/common';
import { TimelineService } from './timeline.service';

@Controller('timeline')
export class TimelineController {
  constructor(private readonly timeline: TimelineService) {}

  @Get('order/:tenantId/:orderId')
  async getOrderTimeline(
    @Param('tenantId') tenantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.timeline.getOrderTimeline(tenantId, orderId);
  }

  @Get('customer/:tenantId/:customerId')
  async getCustomerTimeline(
    @Param('tenantId') tenantId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.timeline.getCustomerTimeline(tenantId, customerId);
  }

  @Get('recent/:tenantId')
  async getRecentActivity(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.timeline.getRecentActivity(tenantId, limit ? parseInt(limit) : 50);
  }
}
