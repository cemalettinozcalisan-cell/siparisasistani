import { Module } from '@nestjs/common';
import { VerimorController } from './verimor.controller';
import { VerimorSmsProvider } from './verimor-sms.provider';
import { VerimorIncomingSms } from './verimor-incoming-sms';
import { AiBrainModule } from '../ai/brain/ai-brain.module';
import { OrderEngineModule } from '../order-engine/order-engine.module';
import { SupabaseService } from '../common/supabase.client';

@Module({
  imports: [AiBrainModule, OrderEngineModule],
  controllers: [VerimorController],
  providers: [VerimorSmsProvider, VerimorIncomingSms, SupabaseService],
  exports: [VerimorSmsProvider],
})
export class VerimorModule {}
