import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.client';
import { AiBrainService } from '../../ai/brain/ai-brain.service';
import { NetgsmProvider } from '../providers/netgsm.provider';

@Injectable()
export class CallEventsWebhook {
  private readonly logger = new Logger(CallEventsWebhook.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly brain: AiBrainService,
    private readonly netgsm: NetgsmProvider,
  ) {}

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

      // Faz 1: Görüşme bittiğinde otomatik özet + duygu analizi
      if (status === 'COMPLETED' || status === 'FAILED') {
        this.brain.generateCallSummary(sessionId)
          .then(async (summary) => {
            if (summary) {
              this.logger.log(`Summary: ${summary.shortSummary} | Sentiment: ${summary.sentiment} (${summary.sentimentScore}%)`);

              // Faz 3.2: Görüşme özetini esnafa SMS ile bildir
              try {
                const { data: session } = await this.supabase.db
                  .from('conversation_sessions')
                  .select('tenant_id, phone')
                  .eq('id', sessionId)
                  .single();

                if (session) {
                  const { data: tenant } = await this.supabase.db
                    .from('tenants')
                    .select('phone')
                    .eq('id', session.tenant_id)
                    .single();

                  const sentimentEmoji = summary.sentiment === 'HAPPY' ? '😊' : summary.sentiment === 'UNHAPPY' ? '😟' : summary.sentiment === 'ANGRY' ? '😡' : '😐';
                  const sms = [
                    `SiparisAsistani - Gorusme Ozeti ${sentimentEmoji}`,
                    `Mus: ${summary.customerName || session.phone}`,
                    `Sure: ${Math.round(summary.durationSeconds / 60)}dk`,
                    summary.productCount > 0 ? `Urun: ${summary.products.join(', ')}` : '',
                    `Odeme: ${summary.paymentMethod}`,
                    summary.shortSummary,
                  ].filter(Boolean).join('\n');

                  if (tenant?.phone) {
                    await this.netgsm.sendSms(tenant.phone, sms);
                    this.logger.log(`Summary SMS sent to tenant ${session.tenant_id} at ${tenant.phone}`);
                  }
                }
              } catch (smsErr) {
                this.logger.warn(`Summary SMS failed: ${(smsErr as Error).message}`);
              }
            }
          })
          .catch((e) => this.logger.error(`Summary failed: ${(e as Error).message}`));
      }
    }
  }
}
