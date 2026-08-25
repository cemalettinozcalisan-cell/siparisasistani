import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { ChannelHealthModule } from '../channel-health/channel-health.module';
import { SupabaseService } from '../common/supabase.client';

@Module({
  imports: [ChannelHealthModule],
  controllers: [SupportController],
  providers: [SupportService, SupabaseService],
  exports: [SupportService],
})
export class SupportModule {}
