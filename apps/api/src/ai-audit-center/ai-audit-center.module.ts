import { Module } from '@nestjs/common';
import { AiAuditCenterController } from './ai-audit-center.controller';
import { SupabaseService } from '../common/supabase.client';

@Module({
  controllers: [AiAuditCenterController],
  providers: [SupabaseService],
})
export class AiAuditCenterModule {}
