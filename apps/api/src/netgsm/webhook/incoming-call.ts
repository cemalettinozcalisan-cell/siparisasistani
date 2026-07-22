import { Injectable, Logger } from '@nestjs/common';
import { CallFlowService } from '../call-flow.service';

@Injectable()
export class IncomingCallWebhook {
  private readonly logger = new Logger(IncomingCallWebhook.name);

  constructor(private readonly callFlow: CallFlowService) {}

  async handle(body: Record<string, unknown>): Promise<string> {
    const phone = (body.caller as string) || (body.from as string) || '';
    const tenantId = (body.tenant_id as string) || this.resolveTenant(body);
    const callId = (body.call_id as string) || '';

    this.logger.log(`Incoming call from ${phone} for tenant ${tenantId}`);

    if (!tenantId) {
      return this.callFlow['xml'].buildHangup();
    }

    return this.callFlow.handleIncomingCall(tenantId, phone, callId);
  }

  private resolveTenant(body: Record<string, unknown>): string {
    const calledNumber = (body.called as string) || (body.to as string) || '';
    return calledNumber;
  }
}
