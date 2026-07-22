import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService, SupabaseService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
