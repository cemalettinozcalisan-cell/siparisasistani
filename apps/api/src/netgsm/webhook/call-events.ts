import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.client';

@Injectable()
export class CallEventsWebhook {
  private readonly logger = new Logger(CallEventsWebhook.name);

  constructor(private readonly supabase: SupabaseService) {}

  async handle(body: Record<string, unknown>): Promise<void> {
    const event = (body.event as string) || '';
    const callId = (body.call_id as string) || '';
    const sessionId = (body.session_id as string) || '';

    this.logger.log(`Call event: ${event} for call ${callId}`);

    const statusMap: Record<string, string> = {
      'ringing': 'RINGING',
      'answered': 'ANSWERED',
      'completed': 'COMPLETED',
      'failed': 'FAILED',
      'timeout': 'TIMEOUT',
      'no-answer': 'FAILED',
    };

    const status = statusMap[event] || 'FAILED';

    if (sessionId) {
      await this.supabase.db
        .from('conversation_sessions')
        .update({
          call_status: status,
          call_duration: body.duration ? Number(body.duration) : null,
          ended_at: ['COMPLETED', 'FAILED', 'TIMEOUT'].includes(status) ? new Date().toISOString() : undefined,
        })
        .eq('id', sessionId);
    }
  }
}
