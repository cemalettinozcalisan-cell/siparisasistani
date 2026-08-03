import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  public client!: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('SUPABASE_URL') || '';
    const key = this.config.get<string>('SUPABASE_SERVICE_KEY') || '';
    if (url) {
      this.logger.log(`Supabase connected: ${url.substring(0, 30)}...`);
    } else {
      this.logger.warn('SUPABASE_URL not set — using mock data');
    }
    this.client = createClient(url, key);
  }

  get db() {
    return this.client;
  }
}
