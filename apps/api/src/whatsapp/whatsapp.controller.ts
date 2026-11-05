import { Controller, Get, Post, Query, Body, Header, HttpCode, Logger } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly service: WhatsappService) {}

  @Get('webhook')
  @Header('Content-Type', 'text/plain')
  verifyWebhook(@Query() query: Record<string, unknown>): string {
    const hub = (query?.hub as Record<string, unknown>) || {};
    const mode = this.readParam(query, hub, 'hub.mode', 'mode');
    const token = this.readParam(query, hub, 'hub.verify_token', 'verify_token');
    const challenge = this.readParam(query, hub, 'hub.challenge', 'challenge');

    const result = this.service.verifyWebhook(mode, token, challenge);
    if (result.ok) {
      this.logger.log('WhatsApp webhook dogrulandi');
      return result.challenge || '';
    }
    this.logger.warn('WhatsApp webhook dogrulama basarisiz');
    return 'forbidden';
  }

  @Post('webhook')
  @HttpCode(200)
  receiveWebhook(@Body() body: Record<string, unknown>): { status: string } {
    void this.service
      .handleWebhook(body)
      .catch((e) => this.logger.error(`WhatsApp webhook arka plan hatasi: ${(e as Error).message}`));
    return { status: 'ok' };
  }

  private readParam(
    query: Record<string, unknown>,
    hub: Record<string, unknown>,
    dotted: string,
    plain: string,
  ): string | undefined {
    const direct = query?.[dotted];
    if (typeof direct === 'string') return direct;
    const nested = hub?.[plain];
    if (typeof nested === 'string') return nested;
    return undefined;
  }
}
