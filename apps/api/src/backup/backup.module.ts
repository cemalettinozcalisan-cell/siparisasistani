import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [BackupController],
  providers: [BackupService, SupabaseService],
  exports: [BackupService],
})
export class BackupModule {}
