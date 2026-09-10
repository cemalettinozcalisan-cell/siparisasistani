import { Module } from '@nestjs/common';
import { AiEmployeeController } from './ai-employee.controller';
import { AiEmployeeService } from './ai-employee.service';
import { VoiceNotificationService } from './voice-notification.service';
import { SupabaseService } from '../common/supabase.client';
import { VoiceModule } from '../voice/voice.module';

@Module({
  imports: [VoiceModule],
  controllers: [AiEmployeeController],
  providers: [AiEmployeeService, VoiceNotificationService, SupabaseService],
  exports: [AiEmployeeService, VoiceNotificationService],
})
export class AiEmployeeModule {}