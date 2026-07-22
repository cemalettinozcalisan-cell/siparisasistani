import { Module } from '@nestjs/common';
import { ActivityLogListener } from './activity-log.listener';
import { WhatsAppGroupListener } from './whatsapp-group.listener';
import { PrintQueueListener } from './print-queue.listener';
import { SupabaseService } from '../../common/supabase.client';

@Module({
  providers: [
    ActivityLogListener,
    WhatsAppGroupListener,
    PrintQueueListener,
    SupabaseService,
  ],
})
export class EventBusListenersModule {}
