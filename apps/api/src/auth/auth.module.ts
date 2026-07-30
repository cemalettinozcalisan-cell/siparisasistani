import { Module, Global } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TenantGuard } from './tenant.guard';
import { SupabaseService } from '../common/supabase.client';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, TenantGuard, SupabaseService, Reflector],
  exports: [AuthService, TenantGuard],
})
export class AuthModule {}
