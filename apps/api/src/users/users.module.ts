import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { SupabaseService } from '../common/supabase.client';
import { AuthModule } from '../auth/auth.module';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [AuthModule, TimelineModule],
  controllers: [UsersController],
  providers: [SupabaseService],
})
export class UsersModule {}
