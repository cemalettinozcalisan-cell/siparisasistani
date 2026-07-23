import { Module } from '@nestjs/common';
import { NotificationsApiController } from './notifications-api.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [NotificationsApiController],
  providers: [SupabaseService],
})
export class NotificationsApiModule {}
