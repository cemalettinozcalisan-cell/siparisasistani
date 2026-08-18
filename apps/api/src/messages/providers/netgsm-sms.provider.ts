import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NetgsmProvider } from '../../netgsm/providers/netgsm.provider';
import { OutboundChannel, OutboundMessage, OutboundSendResult, OutboundHealth } from '../outbound-channel.interface';

/**
 * NetGSM SMS kanalı — gerçek gönderim (env kimlik bilgileriyle çalışır).
 */
@Injectable()
export class NetgsmSmsProvider implements OutboundChannel {
  readonly name = 'sms' as const;
  private readonly logger = new Logger(NetgsmSmsProvider.name);
  private readonly netgsm: NetgsmProvider;

  constructor(private readonly config: ConfigService) {
    this.netgsm = new NetgsmProvider(config);
  }

  async isConfigured(): Promise<boolean> {
    return Boolean(
      this.config.get<string>('NETGSM_USERNAME') &&
      this.config.get<string>('NETGSM_PASSWORD'),
    );
  }

  async send(message: OutboundMessage): Promise<OutboundSendResult> {
    if (!message.to) return { success: false, error: 'SMS hedef telefon yok' };

    try {
      const result = await this.netgsm.sendSms(message.to, message.body);
      if (!result.success) {
        this.logger.warn(`NetGSM SMS failed for ${message.to}`);
        return { success: false, provider: 'netgsm', error: 'NetGSM SMS gönderimi başarısız' };
      }
      return { success: true, provider: 'netgsm', providerMessageId: result.messageId };
    } catch (err) {
      this.logger.error(`NetGSM SMS error: ${(err as Error).message}`);
      return { success: false, provider: 'netgsm', error: (err as Error).message };
    }
  }

  async healthCheck(): Promise<OutboundHealth> {
    const configured = await this.isConfigured();
    if (!configured) {
      return { healthy: false, configured, message: 'NetGSM hesabı tanımlı değil' };
    }
    return { healthy: true, configured, message: 'OK' };
  }
}
