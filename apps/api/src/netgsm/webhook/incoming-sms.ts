import { Injectable, Logger } from '@nestjs/common';
import { AiBrainService } from '../../ai/brain/ai-brain.service';
import { NetgsmProvider } from '../providers/netgsm.provider';
import { SupabaseService } from '../../common/supabase.client';

@Injectable()
export class IncomingSmsWebhook {
  private readonly logger = new Logger(IncomingSmsWebhook.name);

  constructor(
    private readonly brain: AiBrainService,
    private readonly netgsm: NetgsmProvider,
    private readonly supabase: SupabaseService,
  ) {}

  async handle(body: Record<string, unknown>) {
    const phone = String(body.gsmno || body.number || body.msisdn || body.from || '');
    const message = String(body.message || body.msg || body.text || body.content || '');
    const tenantId = String(body.tenant_id || '00000000-0000-0000-0000-000000000001');

    if (!phone || !message) {
      this.logger.warn('SMS webhook received empty phone or message');
      return { received: false, reason: 'empty payload' };
    }

    this.logger.log(`SMS from ${phone}: ${message.substring(0, 80)}`);

    // Process through AI Brain
    const result = await this.brain.process({
      tenantId,
      phone,
      messages: [{ role: 'customer', content: message }],
      channel: 'sms',
      channelSource: 'netgsm',
    });

    // Send AI reply back via SMS
    if (result.reply) {
      await this.netgsm.sendSms(phone, result.reply);
    }

    return { received: true, replySent: !!result.reply };
  }
}
