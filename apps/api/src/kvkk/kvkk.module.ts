import { Module } from '@nestjs/common';
import { KvkkController } from './kvkk.controller';
import { KvkkService } from './kvkk.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [KvkkController],
  providers: [KvkkService, SupabaseService],
  exports: [KvkkService],
})
export class KvkkModule {}
