import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [HealthController],
  providers: [SupabaseService],
})
export class HealthModule {}
