import { Module } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { IysService } from './iys.service';
import { IysController } from './iys.controller';
import { NetgsmIysProvider } from './providers/netgsm-iys.provider';

@Module({
  controllers: [IysController],
  providers: [IysService, NetgsmIysProvider, SupabaseService],
  exports: [IysService],
})
export class IysModule {}
