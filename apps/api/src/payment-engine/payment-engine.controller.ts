import { Controller, Post, Body } from '@nestjs/common';
import { PaymentEngineService } from './payment-engine.service';

@Controller('payments')
export class PaymentEngineController {
  constructor(private readonly engine: PaymentEngineService) {}

  @Post('webhook')
  async paymentWebhook(@Body() body: { paymentId: string; transactionId?: string; status?: string }) {
    if (body.status === 'paid') {
      await this.engine.confirmPayment(body.paymentId, body.transactionId);
    }
    return { status: 'ok' };
  }
}
