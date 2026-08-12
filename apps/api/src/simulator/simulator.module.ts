import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';
import { AiBrainModule } from '../ai/brain/ai-brain.module';
import { AiModule } from '../ai/ai.module';
import { SupabaseService } from '../common/supabase.client';

@Module({
  imports: [AiBrainModule, AiModule],
  controllers: [SimulatorController],
  providers: [SimulatorService, SupabaseService],
})
export class SimulatorModule {}
