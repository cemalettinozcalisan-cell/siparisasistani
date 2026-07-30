import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [ApiKeysController],
  providers: [ApiKeysService, SupabaseService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
