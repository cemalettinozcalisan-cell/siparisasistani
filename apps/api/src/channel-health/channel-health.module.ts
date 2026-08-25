import { Module } from '@nestjs/common';
import { ChannelHealthService } from './channel-health.service';
import { ChannelHealthController } from './channel-health.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  providers: [ChannelHealthService, SupabaseService],
  controllers: [ChannelHealthController],
  exports: [ChannelHealthService],
})
export class ChannelHealthModule {}
