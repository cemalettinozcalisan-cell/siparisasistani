import { Injectable, Logger } from '@nestjs/common';
import { CallFlowService } from '../call-flow.service';

@Injectable()
export class DtmfWebhook {
  private readonly logger = new Logger(DtmfWebhook.name);

  constructor(private readonly callFlow: CallFlowService) {}

  async handle(sessionId: string, body: Record<string, unknown>): Promise<string> {
    const digits = (body.digits as string) || (body.Digits as string) || '';

    this.logger.log(`DTMF received: "${digits}" for session ${sessionId}`);

    return this.callFlow.handleDtmf(sessionId, digits);
  }
}
