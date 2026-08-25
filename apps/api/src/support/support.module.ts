import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportChatService } from './support-chat.service';
import { SupportController } from './support.controller';
import { ChannelHealthModule } from '../channel-health/channel-health.module';
import { AiModule } from '../ai/ai.module';
import { SupabaseService } from '../common/supabase.client';

@Module({
  imports: [ChannelHealthModule, AiModule],
  controllers: [SupportController],
  providers: [SupportService, SupportChatService, SupabaseService],
  exports: [SupportService, SupportChatService],
})
export class SupportModule {}
