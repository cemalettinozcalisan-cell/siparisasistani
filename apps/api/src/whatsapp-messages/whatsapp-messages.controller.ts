import { Controller, Get, Param } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Controller('whatsapp-messages')
export class WhatsAppMessagesController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get(':conversationId')
  async getMessages(@Param('conversationId') conversationId: string) {
    const { data } = await this.supabase.db
      .from('whatsapp_messages')
      .select('id, direction, body, message, media_url, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200);

    return (data || []).map((m: Record<string, unknown>) => ({
      id: m.id,
      direction: m.direction,
      body: m.body || m.message || '',
      mediaUrl: m.media_url,
      createdAt: m.created_at,
    }));
  }
}
