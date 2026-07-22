import { Controller, Post, Body } from '@nestjs/common';
import { OrderProcessorService, AiOrderOutput } from './order-processor.service';

@Controller('orders')
export class OrderProcessorController {
  constructor(private readonly processor: OrderProcessorService) {}

  @Post('create-from-ai')
  async createFromAi(@Body() body: AiOrderOutput) {
    return this.processor.process(body);
  }
}
