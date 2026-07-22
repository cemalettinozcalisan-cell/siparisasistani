import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService, SupabaseService],
})
export class ConversationsModule {}
