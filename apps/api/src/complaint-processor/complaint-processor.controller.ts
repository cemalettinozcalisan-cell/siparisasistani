import { Controller, Post, Body } from '@nestjs/common';
import { ComplaintProcessorService, AiComplaintInput } from './complaint-processor.service';

@Controller('complaints')
export class ComplaintProcessorController {
  constructor(private readonly processor: ComplaintProcessorService) {}

  @Post('create-from-ai')
  async createFromAi(@Body() body: AiComplaintInput) {
    return this.processor.process(body);
  }
}
