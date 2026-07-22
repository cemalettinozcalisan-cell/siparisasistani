import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  providers: [PaymentsService, SupabaseService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
