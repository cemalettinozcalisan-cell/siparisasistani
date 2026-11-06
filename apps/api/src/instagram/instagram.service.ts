import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { AiBrainService } from '../ai/brain/ai-brain.service';
import { WebhookDedupService } from '../webhook/webhook-dedup.service';
import { ChannelHealthService } from '../channel-health/channel-health.service';
import { generateSessionLabel, sessionWindowStart } from '../common/chat-session';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly brain: AiBrainService,
    private readonly dedup: WebhookDedupService,
    private readonly channelHealth: ChannelHealthService,
  ) {}

  async handleWebhook(tenantId: string, body: Record<string, unknown>) {
    this.logger.log(`Instagram webhook received for tenant ${tenantId}`);
    const entries = body.entry as Record<string, unknown>[] || [];
    for (const entry of entries) {
      const messaging = entry.messaging as Record<string, unknown>[] || [];
      for (const event of messaging) {
        const sender = event.sender as Record<string, unknown>;
        const message = event.message as Record<string, unknown>;
        if (!sender || !message) continue;

        // Idempotency: Meta aynı mesajı retry ederse çift işleme engelle
        const messageId = String((message as any).mid || '');
        if (messageId) {
          const isDuplicate = await this.dedup.claim(tenantId, 'instagram', messageId);
          if (isDuplicate) {
            this.logger.log(`Instagram duplicate message ${messageId} ignored`);
            continue;
          }
        }

        const igUserId = String(sender.id);
        const text = String(message.text || '');
        const username = String((sender as any).name || igUserId);

        // Find or create conversation
        const conv = await this.findOrCreateConversation(tenantId, igUserId, username);

        // Save incoming message
        await this.saveMessage(conv.id, tenantId, 'incoming', text);

        // Faz 3.3: Route to AI Brain for response
        try {
          // Get existing conversation session for context
          const run = (windowColumn: 'updated_at' | 'created_at') =>
            this.supabase.db
              .from('conversation_sessions')
              .select('id, messages')
              .eq('tenant_id', tenantId)
              .eq('phone', igUserId)
              .eq('channel', 'instagram')
              .or('status.eq.active,and(status.eq.completed,order_id.not.is.null)')
              .gte(windowColumn, sessionWindowStart())
              .order('created_at', { ascending: false })
              .limit(1);

          let { data: session, error: sessionErr } = await run('updated_at');
          if (sessionErr) ({ data: session } = await run('created_at'));

          let sessionId: string;
          let history: { role: string; content: string }[] = [];

          if (session && session.length > 0) {
            sessionId = session[0].id as string;
            history = typeof session[0].messages === 'string'
              ? JSON.parse(session[0].messages)
              : (session[0].messages as { role: string; content: string }[]) || [];
          } else {
            const { data: newSession } = await this.supabase.db
              .from('conversation_sessions')
              .insert({
                tenant_id: tenantId,
                channel: 'instagram',
                channel_source: 'instagram',
                phone: igUserId,
                status: 'active',
                messages: [],
                session_label: generateSessionLabel(),
                created_at: new Date().toISOString(),
              })
              .select('id')
              .single();

            sessionId = (newSession?.id as string) || '';
          }

          history.push({ role: 'customer', content: text });

          const result = await this.brain.process({
            tenantId,
            phone: igUserId,
            sessionId,
            messages: history.map((m) => ({
              role: m.role === 'customer' || m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
            })),
            channel: 'instagram' as any,
            channelSource: 'instagram',
          });

          const aiReply = result.reply || '';
          if (aiReply) {
            const storedMessages = result.resetHistory
              ? [{ role: 'customer', content: text }, { role: 'assistant', content: aiReply }]
              : [...history, { role: 'assistant', content: aiReply }];

            await this.supabase.db
              .from('conversation_sessions')
              .update({
                messages: storedMessages,
                updated_at: new Date().toISOString(),
                status: result.orderCreated ? 'completed' : 'active',
              })
              .eq('id', result.sessionId || sessionId);

            await this.saveMessage(conv.id, tenantId, 'outgoing', aiReply);
            await this.sendMessage(conv.id, tenantId, aiReply);

            this.logger.log(`Instagram DM reply sent to ${username}: ${aiReply.substring(0, 80)}`);
            await this.channelHealth.record(tenantId, 'instagram', true);
          }
        } catch (e) {
          this.logger.error(`Instagram DM brain processing failed: ${(e as Error).message}`);
          await this.channelHealth.record(tenantId, 'instagram', false, { error: (e as Error).message, errorCode: 'INSTAGRAM_PROCESS' });
        }
      }
    }
    return { status: 'ok' };
  }

  private async findOrCreateConversation(tenantId: string, igUserId: string, username: string) {
    const { data: existing } = await this.supabase.db
      .from('instagram_conversations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('instagram_user_id', igUserId)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) return existing;

    const { data: created } = await this.supabase.db
      .from('instagram_conversations')
      .insert({ tenant_id: tenantId, instagram_user_id: igUserId, username })
      .select('id')
      .single();

    return created || { id: igUserId };
  }

  private async saveMessage(conversationId: string, tenantId: string, direction: string, body: string) {
    await this.supabase.db.from('instagram_messages').insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      direction,
      body,
    });
  }

  async sendMessage(conversationId: string, tenantId: string, text: string) {
    await this.saveMessage(conversationId, tenantId, 'outgoing', text);
    // Not: Meta Graph API entegrasyonu canlı ortamda yapılandırılmalı
    this.logger.log(`Instagram DM out: conv=${conversationId}, text=${text.substring(0, 80)}`);
  }
}
