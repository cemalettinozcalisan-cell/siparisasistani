import { Module, Global } from '@nestjs/common';
import { ChannelHealthService } from './channel-health.service';
import { ChannelHealthController } from './channel-health.controller';
import { SupabaseService } from '../common/supabase.client';
import { AiModule } from '../ai/ai.module';

@Global()
@Module({
  imports: [AiModule],
  providers: [ChannelHealthService, SupabaseService],
  controllers: [ChannelHealthController],
  exports: [ChannelHealthService],
})
export class ChannelHealthModule {}
