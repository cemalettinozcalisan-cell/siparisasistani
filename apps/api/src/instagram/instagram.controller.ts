import { Controller, Post, Get, Param, Body, Logger } from '@nestjs/common';
import { InstagramService } from './instagram.service';

@Controller('instagram')
export class InstagramController {
  private readonly logger = new Logger(InstagramController.name);

  constructor(private readonly service: InstagramService) {}

  // Meta Webhook doğrulama (GET)
  @Get('webhook')
  verifyWebhook(@Param() params: Record<string, string>, @Body() body: Record<string, unknown>) {
    this.logger.log('Instagram webhook verification');
    return { status: 'ok' };
  }

  // Meta Webhook mesaj alma (POST)
  @Post('webhook/:tenantId')
  async receiveWebhook(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    return this.service.handleWebhook(tenantId, body);
  }

  // Instagram DM gönderme (test için)
  @Post('send/:tenantId/:conversationId')
  async sendMessage(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: { text: string },
  ) {
    await this.service.sendMessage(conversationId, tenantId, body.text);
    return { status: 'sent' };
  }
}
