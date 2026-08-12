import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { AiBrainService } from '../ai/brain/ai-brain.service';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly brain: AiBrainService,
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
          const { data: session } = await this.supabase.db
            .from('conversation_sessions')
            .select('id, messages')
            .eq('tenant_id', tenantId)
            .eq('phone', igUserId)
            .eq('channel', 'instagram')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1);

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
              role: m.role === 'customer' ? 'user' : 'assistant',
              content: m.content,
            })),
            channel: 'instagram' as any,
            channelSource: 'instagram',
          });

          const aiReply = result.reply || '';
          if (aiReply) {
            history.push({ role: 'assistant', content: aiReply });

            await this.supabase.db
              .from('conversation_sessions')
              .update({
                messages: history,
                updated_at: new Date().toISOString(),
                status: result.orderCreated ? 'completed' : 'active',
              })
              .eq('id', sessionId);

            await this.saveMessage(conv.id, tenantId, 'outgoing', aiReply);
            await this.sendMessage(conv.id, tenantId, aiReply);

            this.logger.log(`Instagram DM reply sent to ${username}: ${aiReply.substring(0, 80)}`);
          }
        } catch (e) {
          this.logger.error(`Instagram DM brain processing failed: ${(e as Error).message}`);
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
