import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  providers: [ShipmentsService, SupabaseService],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}
