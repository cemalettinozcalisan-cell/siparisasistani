import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';

@Injectable()
export class CallSessionsService {
  private readonly logger = new Logger(CallSessionsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(tenantId: string, phone: string): Promise<string> {
    const { data, error } = await this.supabase.db
      .from('call_sessions')
      .insert({ tenant_id: tenantId, phone, status: 'active' })
      .select('id')
      .single();

    if (error) throw new Error(`Call session creation failed: ${error.message}`);
    return data.id;
  }

  async end(
    sessionId: string,
    data: { transcript?: string; recordingUrl?: string; confidence?: number },
  ): Promise<void> {
    await this.supabase.db
      .from('call_sessions')
      .update({
        ended_at: new Date().toISOString(),
        status: 'completed',
        transcript: data.transcript,
        recording_url: data.recordingUrl,
        confidence: data.confidence,
      })
      .eq('id', sessionId);

    const { data: session } = await this.supabase.db
      .from('call_sessions')
      .select('tenant_id')
      .eq('id', sessionId)
      .single();

    if (session) {
      this.eventBus.emit(SystemEvents.ACTIVITY_LOG, session.tenant_id, {
        entityType: 'call_session',
        entityId: sessionId,
        description: 'Telefon görüşmesi tamamlandı',
        actorType: 'system',
      });
    }
  }

  async findByPhone(tenantId: string, phone: string, limit = 5) {
    const { data } = await this.supabase.db
      .from('call_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }
}
