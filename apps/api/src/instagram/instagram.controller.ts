import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Logger,
  Query,
  Headers,
  Req,
  Res,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { InstagramService } from './instagram.service';

@Controller('instagram')
export class InstagramController {
  private readonly logger = new Logger(InstagramController.name);

  constructor(private readonly service: InstagramService) {}

  // Meta webhook doğrulama: challenge yalnızca tenant'ın verify token'ı doğruysa döner.
  @Get('webhook/:tenantId')
  async verifyWebhook(
    @Param('tenantId') tenantId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const result = await this.service.verifyWebhook(tenantId, mode || '', token || '', challenge || '');
    if (!result.ok) {
      res.status(403).type('text/plain').send('Forbidden');
      return;
    }
    res.status(200).type('text/plain').send(result.challenge);
  }

  // Meta webhook mesaj alma: tenant app secret ile X-Hub-Signature-256 doğrulanır.
  @Post('webhook/:tenantId')
  async receiveWebhook(
    @Param('tenantId') tenantId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    const valid = await this.service.verifySignature(tenantId, req.rawBody, signature);
    if (!valid) {
      this.logger.warn(`Instagram webhook signature invalid for tenant ${tenantId}`);
      throw new ForbiddenException('Invalid Instagram signature');
    }
    return this.service.handleWebhook(tenantId, body);
  }

  // Dev-only: Meta webhook'u beklemeden sahte payload ile akış testi.
  // Üretimde INSTAGRAM_TEST_SECRET boş bırakılır; endpoint 404 döner.
  @Post('test/webhook/:tenantId')
  async testWebhook(
    @Param('tenantId') tenantId: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-instagram-test-secret') secret?: string,
  ) {
    const expected = process.env.INSTAGRAM_TEST_SECRET || '';
    if (!expected || secret !== expected) throw new NotFoundException();
    return this.service.handleWebhook(tenantId, body);
  }

  // Test gönderimi: gerçek Meta Instagram gönderimi yapar ve sonucu döner.
  @Post('send/:tenantId/:conversationId')
  async sendMessage(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: { text: string; to?: string },
  ) {
    const result = await this.service.sendMessage(conversationId, tenantId, body.text, body.to);
    return {
      status: result.success ? 'sent' : 'failed',
      provider: result.provider || 'meta_instagram',
      providerMessageId: result.providerMessageId,
      error: result.error,
    };
  }
}
