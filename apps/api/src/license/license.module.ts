import { Module } from '@nestjs/common';
import { LicenseController } from './license.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [LicenseController],
  providers: [SupabaseService],
})
export class LicenseModule {}
