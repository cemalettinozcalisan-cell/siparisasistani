import { Controller, Post, Body, Param, Patch } from '@nestjs/common';
import { OrderEngineService } from './order-engine.service';
import { AiOrderInput } from '@siparis/types';

@Controller('orders')
export class OrderEngineController {
  constructor(private readonly engine: OrderEngineService) {}

  @Post()
  async createOrder(
    @Body() body: { input: AiOrderInput; tenantId: string },
  ) {
    return this.engine.process(body.input, body.tenantId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.engine.updateStatus(id, body.status);
  }

  @Patch(':id/cancel')
  async cancelOrder(@Param('id') id: string) {
    return this.engine.cancelOrder(id);
  }
}
