import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { SupabaseService } from '../common/supabase.client';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [SupabaseService],
})
export class UsersModule {}
