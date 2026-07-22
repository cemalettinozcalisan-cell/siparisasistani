import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [ExportController],
  providers: [SupabaseService],
})
export class ExportModule {}
