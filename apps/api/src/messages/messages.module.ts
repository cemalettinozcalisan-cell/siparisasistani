import { Module } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { OutboundChannelFactory } from './outbound.factory';
import { OutboundService } from './outbound.service';
import { OutboundWorker } from './outbound.worker';
import { OutboundController } from './outbound.controller';
import { ChannelHealthModule } from '../channel-health/channel-health.module';

@Module({
  imports: [ChannelHealthModule],
  controllers: [OutboundController],
  providers: [
    OutboundChannelFactory,
    OutboundService,
    OutboundWorker,
    SupabaseService,
  ],
  exports: [OutboundService, OutboundChannelFactory],
})
export class MessagesModule {}
