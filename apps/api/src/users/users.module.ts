import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [UsersController],
  providers: [SupabaseService],
})
export class UsersModule {}
