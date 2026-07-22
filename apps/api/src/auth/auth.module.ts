import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SupabaseService],
})
export class AuthModule {}
