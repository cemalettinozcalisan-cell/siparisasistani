import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase.client';
import { OutboundChannel, OutboundChannelName, OutboundHealth } from './outbound-channel.interface';
import { NetgsmSmsProvider } from './providers/netgsm-sms.provider';
import { MetaWhatsappProvider } from './providers/meta-whatsapp.provider';
import { MetaInstagramProvider } from './providers/meta-instagram.provider';
import { WhatsAppGroupProvider } from './providers/whatsapp-group.provider';

@Injectable()
export class OutboundChannelFactory {
  private readonly logger = new Logger(OutboundChannelFactory.name);
  private channels: Map<OutboundChannelName, OutboundChannel> = new Map();

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    this.register(new NetgsmSmsProvider(config));
    this.register(new MetaWhatsappProvider(config, supabase));
    this.register(new MetaInstagramProvider(config, supabase));
    this.register(new WhatsAppGroupProvider(config, supabase));

    this.logger.log('Outbound channels: sms, whatsapp, instagram, whatsapp_group');
  }

  private register(channel: OutboundChannel) {
    this.channels.set(channel.name, channel);
  }

  getChannel(name: OutboundChannelName): OutboundChannel {
    const channel = this.channels.get(name);
    if (!channel) throw new Error(`Outbound channel "${name}" not found`);
    return channel;
  }

  listChannels(): OutboundChannelName[] {
    return Array.from(this.channels.keys());
  }

  async isConfigured(name: OutboundChannelName, tenantId: string): Promise<boolean> {
    try {
      return await this.getChannel(name).isConfigured(tenantId);
    } catch {
      return false;
    }
  }

  async healthCheckAll(tenantId: string): Promise<Record<string, OutboundHealth>> {
    const results: Record<string, OutboundHealth> = {};
    for (const [name, channel] of this.channels) {
      try {
        results[name] = await channel.healthCheck(tenantId);
      } catch (err) {
        results[name] = { healthy: false, configured: false, message: (err as Error).message };
      }
    }
    return results;
  }
}
