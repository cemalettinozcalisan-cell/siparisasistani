import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.client';

@Injectable()
export class RecordingsWebhook {
  private readonly logger = new Logger(RecordingsWebhook.name);

  constructor(private readonly supabase: SupabaseService) {}

  async handle(body: Record<string, unknown>): Promise<void> {
    const sessionId = (body.session_id as string) || '';
    const recordingUrl = (body.recording_url as string) || (body.RecordingUrl as string) || '';
    const duration = body.duration ? Number(body.duration) : 0;

    this.logger.log(`Recording received for session ${sessionId}: ${recordingUrl}`);

    if (!sessionId || !recordingUrl) return;

    const { data: session } = await this.supabase.db
      .from('conversation_sessions')
      .select('tenant_id, phone')
      .eq('id', sessionId)
      .single();

    if (session) {
      await this.supabase.db.from('call_recordings').insert({
        tenant_id: session.tenant_id,
        session_id: sessionId,
        phone: session.phone,
        direction: 'incoming',
        recording_url: recordingUrl,
        duration_seconds: duration,
        status: 'completed',
      });

      await this.supabase.db
        .from('conversation_sessions')
        .update({ call_recording_url: recordingUrl })
        .eq('id', sessionId);
    }
  }
}
