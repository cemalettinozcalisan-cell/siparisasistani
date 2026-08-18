import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.client';

@Injectable()
export class WhatsAppConversationsService {
  private readonly logger = new Logger(WhatsAppConversationsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async findOrCreate(tenantId: string, phone: string): Promise<string> {
    const { data: existing } = await this.supabase.db
      .from('whatsapp_conversations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) return existing.id;

    const { data: created, error } = await this.supabase.db
      .from('whatsapp_conversations')
      .insert({ tenant_id: tenantId, phone, status: 'active' })
      .select('id')
      .single();

    if (error) throw new Error(`WhatsApp conversation creation failed: ${error.message}`);
    return created.id;
  }

  async addMessage(params: {
    tenantId: string;
    conversationId: string;
    direction: 'incoming' | 'outgoing';
    body: string;
    attachment?: string;
  }) {
    const { error } = await this.supabase.db
      .from('whatsapp_messages')
      .insert({
        tenant_id: params.tenantId,
        conversation_id: params.conversationId,
        direction: params.direction,
        body: params.body,
        message: params.body,
        attachment: params.attachment || null,
        status: 'queued',
      });

    if (error) {
      this.logger.error(`WhatsApp message save failed: ${error.message}`);
      return;
    }

    await this.supabase.db.rpc('increment_message_count', {
      conv_id: params.conversationId,
    });
  }

  async getHistory(conversationId: string) {
    const { data } = await this.supabase.db
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    return data || [];
  }
}
