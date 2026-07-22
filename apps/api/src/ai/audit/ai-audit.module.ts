import { Module } from '@nestjs/common';
import { AiAuditService } from './ai-audit.service';
import { SupabaseService } from '../../common/supabase.client';

@Module({
  providers: [AiAuditService, SupabaseService],
  exports: [AiAuditService],
})
export class AiAuditModule {}
