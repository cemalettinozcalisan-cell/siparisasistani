import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.client';

export interface AuditEntry {
  tenantId: string;
  sessionId?: string;
  conversationId?: string;
  systemPrompt?: string;
  userMessage?: string;
  model: string;
  provider: string;
  rawResponse?: string;
  parsedJson?: Record<string, unknown>;
  confidence?: number;
  latencyMs?: number;
  tokenPrompt?: number;
  tokenCompletion?: number;
  success: boolean;
  errorMessage?: string;
}

@Injectable()
export class AiAuditService {
  private readonly logger = new Logger(AiAuditService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.supabase.db.from('ai_audit_logs').insert({
        tenant_id: entry.tenantId,
        session_id: entry.sessionId || null,
        conversation_id: entry.conversationId || null,
        system_prompt: entry.systemPrompt || null,
        user_message: entry.userMessage || null,
        model: entry.model,
        provider: entry.provider,
        raw_response: entry.rawResponse || null,
        parsed_json: entry.parsedJson || null,
        confidence: entry.confidence ?? null,
        latency_ms: entry.latencyMs ?? null,
        token_prompt: entry.tokenPrompt ?? null,
        token_completion: entry.tokenCompletion ?? null,
        success: entry.success,
        error_message: entry.errorMessage || null,
      });
    } catch (err) {
      this.logger.error(`AI audit log failed: ${(err as Error).message}`);
    }
  }

  async getBySession(sessionId: string) {
    const { data } = await this.supabase.db
      .from('ai_audit_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    return data || [];
  }

  async getByTenant(tenantId: string, limit = 50) {
    const { data } = await this.supabase.db
      .from('ai_audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }
}
