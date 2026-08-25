import { Injectable, Logger } from '@nestjs/common';
import { CallFlowService } from '../call-flow.service';
import { SupabaseService } from '../../common/supabase.client';

@Injectable()
export class IncomingCallWebhook {
  private readonly logger = new Logger(IncomingCallWebhook.name);

  constructor(
    private readonly callFlow: CallFlowService,
    private readonly supabase: SupabaseService,
  ) {}

  async handle(body: Record<string, unknown>): Promise<string> {
    const phone = (body.caller as string) || (body.from as string) || '';
    const tenantId = (body.tenant_id as string) || this.resolveTenant(body);
    const callId = (body.call_id as string) || '';
    const called = (body.called as string) || (body.to as string) || '';

    // Madde 2: Gelen çağrı owner'ın destek hattına mı? (esnaf sipariş hattından ayrı)
    const isSupport = await this.isSupportLine(called);

    this.logger.log(`Incoming call from ${phone} for tenant ${tenantId}${isSupport ? ' [SUPPORT LINE]' : ''}`);

    if (!tenantId) {
      return this.callFlow['xml'].buildHangup();
    }

    return this.callFlow.handleIncomingCall(tenantId, phone, callId, { isSupport });
  }

  private resolveTenant(body: Record<string, unknown>): string {
    const calledNumber = (body.called as string) || (body.to as string) || '';
    return calledNumber;
  }

  /** Hedef numara owner'ın destek hattı (`admin_alert_settings.support_phone`) ile eşleşiyor mu? */
  private async isSupportLine(called: string): Promise<boolean> {
    if (!called) return false;
    try {
      const { data } = await this.supabase.db
        .from('admin_alert_settings')
        .select('support_phone')
        .eq('id', '00000000-0000-0000-0000-000000000099')
        .maybeSingle();
      const supportPhone = String(data?.support_phone || '').replace(/\D/g, '');
      const normalizedCalled = called.replace(/\D/g, '');
      return !!supportPhone && normalizedCalled.includes(supportPhone.slice(-10));
    } catch {
      return false;
    }
  }
}
