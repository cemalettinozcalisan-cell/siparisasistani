import { Controller, Get, Post, Body } from '@nestjs/common';
import { VerimorIncomingSms } from './verimor-incoming-sms';
import { VerimorSmsProvider } from './verimor-sms.provider';

@Controller('verimor')
export class VerimorController {
  constructor(
    private readonly incoming: VerimorIncomingSms,
    private readonly sms: VerimorSmsProvider,
  ) {}

  /**
   * Verimor gelen SMS PUSH webhook'u.
   * Verimor "HTTP/1.1 200 OK" beklediği için hemen 200 döneriz; işleme arka planda devam eder.
   */
  @Post('webhook/sms')
  smsWebhook(@Body() body: unknown) {
    void this.incoming.handle(body);
    return { received: true };
  }

  @Get('health')
  async health() {
    return this.sms.healthCheck();
  }
}
