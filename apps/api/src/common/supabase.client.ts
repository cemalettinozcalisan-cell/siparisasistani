import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  public client!: SupabaseClient;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('SUPABASE_URL') || '';
    const key = this.config.get<string>('SUPABASE_SERVICE_KEY') || '';
    this.client = createClient(url, key);
  }

  get db() {
    return this.client;
  }
}
