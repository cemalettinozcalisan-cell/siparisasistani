import { Module } from '@nestjs/common';
import { AlertRouterService } from './alert-router.service';
import { AlertController } from './alert.controller';
import { SupabaseService } from '../common/supabase.client';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [MessagesModule],
  controllers: [AlertController],
  providers: [AlertRouterService, SupabaseService],
  exports: [AlertRouterService],
})
export class AlertModule {}
