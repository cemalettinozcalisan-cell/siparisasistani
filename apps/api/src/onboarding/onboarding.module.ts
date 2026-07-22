import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [OnboardingController],
  providers: [SupabaseService],
})
export class OnboardingModule {}
