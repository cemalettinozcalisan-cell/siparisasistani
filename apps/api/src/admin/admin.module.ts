import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [AdminController],
  providers: [SupabaseService],
})
export class AdminModule {}
