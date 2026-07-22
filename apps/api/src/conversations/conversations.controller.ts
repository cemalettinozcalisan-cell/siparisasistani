import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { SupabaseService } from '../common/supabase.client';

@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly service: ConversationsService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get(':tenantId')
  async list(@Param('tenantId') tenantId: string, @Query('limit') limit?: string) {
    return this.service.getConversations(tenantId, limit ? parseInt(limit) : 50);
  }

  @Post('seed')
  async seedDemo(@Body() body: { tenantId: string }) {
    const tid = body.tenantId;

    // Demo phone sessions
    for (let i = 0; i < 5; i++) {
      const phone = i % 2 === 0 ? '05321234567' : '05339876543';
      await this.supabase.db.from('conversation_sessions').insert({
        tenant_id: tid, channel: 'phone', channel_source: 'netgsm',
        phone, status: 'completed', call_status: 'COMPLETED',
        session_label: `SESSION-20260722-${String(100 + i).padStart(4, '0')}`,
        call_duration: 120 + i * 30,
        ai_model: 'deepseek-chat',
        created_at: new Date(Date.now() - i * 3600000).toISOString(),
        ended_at: new Date(Date.now() - i * 3600000 + 180000).toISOString(),
      });
    }

    // Demo WhatsApp
    await this.supabase.db.from('whatsapp_conversations').insert({
      tenant_id: tid, phone: '05431234567', status: 'active',
      message_count: 8,
    });

    return { status: 'ok', message: '5 demo conversation added' };
  }
}
