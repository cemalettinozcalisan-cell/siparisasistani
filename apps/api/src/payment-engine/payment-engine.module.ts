import { Module } from '@nestjs/common';
import { PaymentEngineService } from './payment-engine.service';
import { PaymentEngineController } from './payment-engine.controller';
import { SupabaseService } from '../common/supabase.client';
import { TimelineService } from '../timeline/timeline.service';

@Module({
  controllers: [PaymentEngineController],
  providers: [PaymentEngineService, SupabaseService, TimelineService],
})
export class PaymentEngineModule {}
