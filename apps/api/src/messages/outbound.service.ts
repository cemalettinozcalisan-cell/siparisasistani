import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { OutboundChannelFactory } from './outbound.factory';
import { OutboundChannelName, OutboundMessage, OutboundSendResult } from './outbound-channel.interface';

@Injectable()
export class OutboundService {
  private readonly logger = new Logger(OutboundService.name);

  constructor(
    private readonly factory: OutboundChannelFactory,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * Bir mesajı ilgili kanal üzerinden gönderir ve outbound_logs'a yazar.
   */
  async send(message: OutboundMessage): Promise<OutboundSendResult> {
    const channel = this.factory.getChannel(message.channel);

    const configured = await channel.isConfigured(message.tenantId);
    if (!configured) {
      const result: OutboundSendResult = { success: false, error: `${message.channel.toUpperCase()}_NOT_CONFIGURED` };
      await this.log(message, 'provider_not_configured', result);
      return result;
    }

    await this.log(message, 'sending');
    const result = await channel.send(message);
    await this.log(message, result.success ? 'sent' : 'failed', result);

    if (!result.success) {
      this.logger.warn(`[${message.channel}] send failed: ${result.error}`);
    }
    return result;
  }

  /** Kuyruk kaynaklı gönderim: log + mesaj durum güncellemesi dışarıda worker tarafından yönetilir. */
  async sendRaw(message: OutboundMessage): Promise<OutboundSendResult> {
    const channel = this.factory.getChannel(message.channel);
    return channel.send(message);
  }

  async isConfigured(channel: OutboundChannelName, tenantId: string): Promise<boolean> {
    return this.factory.isConfigured(channel, tenantId);
  }

  private async log(
    message: OutboundMessage,
    status: string,
    result?: OutboundSendResult,
  ): Promise<void> {
    try {
      await this.supabase.db.from('outbound_logs').insert({
        tenant_id: message.tenantId,
        channel: message.channel,
        direction: 'outgoing',
        recipient: message.to || null,
        body: message.body,
        status,
        provider: result?.provider || null,
        provider_message_id: result?.providerMessageId || null,
        error_message: result?.error || null,
        template_id: message.templateId || null,
        reference_type: message.orderId ? 'order' : message.customerId ? 'customer' : 'system',
        reference_id: message.orderId || message.customerId || null,
      });
    } catch (err) {
      this.logger.error(`outbound_logs insert failed: ${(err as Error).message}`);
    }
  }
}
