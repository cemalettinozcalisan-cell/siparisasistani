import { Controller, Post, Body } from '@nestjs/common';
import { AiBrainService, BrainInput } from './ai-brain.service';

@Controller('conversation')
export class ConversationController {
  constructor(private readonly brain: AiBrainService) {}

  @Post()
  async handleConversation(@Body() body: BrainInput) {
    return this.brain.process(body);
  }
}
