import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SupabaseService } from '../common/supabase.client';
import { EventBusModule } from '../event-bus/event-bus.module';

@Module({
  imports: [EventBusModule],
  providers: [NotificationService, SupabaseService],
  exports: [NotificationService],
})
export class NotificationModule {}
