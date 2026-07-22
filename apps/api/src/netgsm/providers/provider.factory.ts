import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelephonyProvider } from './telephony-provider.interface';
import { NetgsmProvider } from './netgsm.provider';

@Injectable()
export class TelephonyProviderFactory {
  private readonly logger = new Logger(TelephonyProviderFactory.name);
  private providers: Map<string, TelephonyProvider> = new Map();
  private defaultProvider: string;

  constructor(config: ConfigService) {
    this.register('netgsm', new NetgsmProvider(config));
    this.defaultProvider = config.get<string>('TELEPHONY_PROVIDER', 'netgsm');
  }

  private register(name: string, provider: TelephonyProvider) {
    this.providers.set(name, provider);
  }

  getProvider(name?: string): TelephonyProvider {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Telephony provider "${providerName}" not found`);
    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
