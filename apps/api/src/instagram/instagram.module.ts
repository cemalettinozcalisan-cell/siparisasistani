import { Module } from '@nestjs/common';
import { InstagramController } from './instagram.controller';
import { InstagramService } from './instagram.service';
import { InstagramTokenRefreshService } from './instagram-token-refresh.service';
import { SupabaseService } from '../common/supabase.client';
import { AiBrainModule } from '../ai/brain/ai-brain.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [AiBrainModule, MessagesModule],
  controllers: [InstagramController],
  providers: [InstagramService, InstagramTokenRefreshService, SupabaseService],
  exports: [InstagramService],
})
export class InstagramModule {}
