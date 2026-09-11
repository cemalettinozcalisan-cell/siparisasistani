import { Module } from '@nestjs/common';
import { AiEmployeeController } from './ai-employee.controller';
import { AiEmployeeService } from './ai-employee.service';
import { VoiceNotificationService } from './voice-notification.service';
import { AiEmployeeConversationService } from './ai-employee-conversation.service';
import { SupabaseService } from '../common/supabase.client';
import { VoiceModule } from '../voice/voice.module';
import { CargoTrackingModule } from '../cargo-tracking/cargo-tracking.module';

@Module({
  imports: [VoiceModule, CargoTrackingModule],
  controllers: [AiEmployeeController],
  providers: [AiEmployeeService, VoiceNotificationService, AiEmployeeConversationService, SupabaseService],
  exports: [AiEmployeeService, VoiceNotificationService],
})
export class AiEmployeeModule {}