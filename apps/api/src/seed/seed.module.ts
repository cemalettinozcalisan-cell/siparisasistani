import { Module } from '@nestjs/common';
import { SeedController } from './seed.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [SeedController],
  providers: [SupabaseService],
})
export class SeedModule {}
