import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async handleWebhook(tenantId: string, body: Record<string, unknown>) {
    this.logger.log(`Instagram webhook received for tenant ${tenantId}`);
    // Meta Webhook'undan gelen DM mesajlarını işler
    const entries = body.entry as Record<string, unknown>[] || [];
    for (const entry of entries) {
      const messaging = entry.messaging as Record<string, unknown>[] || [];
      for (const event of messaging) {
        const sender = event.sender as Record<string, unknown>;
        const message = event.message as Record<string, unknown>;
        if (!sender || !message) continue;

        const igUserId = String(sender.id);
        const text = String(message.text || '');

        // Find or create conversation
        const conv = await this.findOrCreateConversation(tenantId, igUserId, String((sender as any).name || ''));

        // Save incoming message
        await this.saveMessage(conv.id, tenantId, 'incoming', text);

        // TODO: Route to AI conversation engine for response
        // For now, just log
        this.logger.log(`Instagram DM from ${igUserId}: ${text}`);
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
    // TODO: Send via Meta Graph API to Instagram
  }
}
