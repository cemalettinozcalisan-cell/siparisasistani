import { Controller, Get, Post, Param, Query, Body, Logger } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { SupabaseService } from '../common/supabase.client';

const MOCK_AUDIT = [
  { user_message: 'Merhaba 2 kilo sucuk istiyorum', raw_response: '{"intent":"ORDER","reply":"Merhaba, siparişinizi alabilir miyim? Adınız ve soyadınız nedir?","customer":{"name":""}}', confidence: 95, created_at: new Date().toISOString() },
  { user_message: 'Ahmet Yılmaz', raw_response: '{"intent":"ORDER","reply":"Teşekkürler Ahmet Bey. 2 kg sucuk siparişinizi onaylıyor musunuz?","customer":{"name":"Ahmet Yılmaz"}}', confidence: 92, created_at: new Date(Date.now() + 10000).toISOString() },
  { user_message: 'Evet onaylıyorum', raw_response: '{"intent":"CONFIRM","reply":"Harika! Siparişiniz alındı. Toplam 600 TL. Teslimat için adresinizi alabilir miyim?","customer":{"name":"Ahmet Yılmaz"}}', confidence: 97, created_at: new Date(Date.now() + 20000).toISOString() },
];

const MOCK_WHATSAPP = [
  { id: 'w1', direction: 'incoming', body: 'Merhaba ürünleriniz var mı?', created_at: new Date(Date.now() - 300000).toISOString() },
  { id: 'w2', direction: 'outgoing', body: 'Merhaba! Evet, sucuk, lokum, bükme ve yumurta çeşitlerimiz mevcut. Ne kadar sipariş vermek istersiniz?', created_at: new Date(Date.now() - 280000).toISOString() },
  { id: 'w3', direction: 'incoming', body: '2 kilo sucuk alabilir miyim?', created_at: new Date(Date.now() - 240000).toISOString() },
  { id: 'w4', direction: 'outgoing', body: 'Tabii, 2 kg sucuk siparişiniz alınmıştır. Toplam 600 TL. Teslimat adresinizi öğrenebilir miyim?', created_at: new Date(Date.now() - 200000).toISOString() },
  { id: 'w5', direction: 'incoming', body: 'Tamam teslim adresim aynı', created_at: new Date(Date.now() - 120000).toISOString() },
];

@Controller('conversations')
export class ConversationsController {
  private readonly logger = new Logger(ConversationsController.name);
  constructor(
    private readonly service: ConversationsService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get(':tenantId')
  async list(@Param('tenantId') tenantId: string, @Query('limit') limit?: string) {
    return this.service.getConversations(tenantId, limit ? parseInt(limit) : 50);
  }

  @Get('detail/:tenantId/:sessionId')
  async detail(@Param('tenantId') tenantId: string, @Param('sessionId') sessionId: string) {
    try {
      const { data: session } = await this.supabase.db
        .from('conversation_sessions')
        .select('*, messages, session_data')
        .eq('tenant_id', tenantId)
        .eq('id', sessionId)
        .maybeSingle();

      if (!session) return this.getMockDetail(sessionId);

      // Get recording (from call_recordings or session fallback)
      const { data: recordings } = await this.supabase.db
        .from('call_recordings')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1);

      const recording = recordings?.[0] || null;
      const recordingUrl = recording?.recording_url || (session as any).call_recording_url || null;

      // Get audit logs for transcript (filtered by session_id)
      const { data: audits } = await this.supabase.db
        .from('ai_audit_logs')
        .select('user_message, raw_response, system_prompt, confidence, created_at')
        .eq('tenant_id', tenantId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(20);

      // Get WhatsApp messages by phone via whatsapp_conversations
      const sessionPhone = (session as any).phone;
      let waMessages: any[] = [];
      if (sessionPhone) {
        const { data: waConv } = await this.supabase.db
          .from('whatsapp_conversations')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('phone', sessionPhone)
          .maybeSingle();

        if (waConv) {
          const { data: msgs } = await this.supabase.db
            .from('whatsapp_messages')
            .select('id, direction, body, message, media_url, created_at')
            .eq('conversation_id', (waConv as any).id)
            .order('created_at', { ascending: true })
            .limit(200);
          waMessages = msgs || [];
        }
      }

      // If database has no data, use mock for demo experience
      const hasRealData = recording || (audits && audits.length > 0) || waMessages.length > 0;
      if (!hasRealData) {
        this.logger.warn('No real data found for session, returning mock');
        return this.getMockDetail(sessionId);
      }

      return {
        session,
        recording: recording ? { ...recording, recording_url: recordingUrl } : recordingUrl ? { recording_url: recordingUrl } : null,
        transcript: audits || [],
        whatsappMessages: waMessages.map((m: Record<string, unknown>) => ({
          id: m.id,
          direction: m.direction,
          body: m.body || m.message || '',
          mediaUrl: m.media_url,
          createdAt: m.created_at,
        })),
      };
    } catch (e) {
      this.logger.warn('Supabase detail query failed, returning mock');
      return this.getMockDetail(sessionId);
    }
  }

  private getMockDetail(sessionId: string) {
    const isWhatsapp = sessionId.startsWith('wa-');
    const isInstagram = sessionId.startsWith('ig-');

    const MOCK_INSTAGRAM = [
      { user_message: 'Merhaba, kangal sucuk fiyatı nedir?', raw_response: '{"intent":"PRICE_INFO","reply":"Merhaba Can Bey! Kangal sucuğumuzun kilosu 300 TL. 2 kg ve üzeri alımlarda kargo ücretsiz."}', confidence: 95, created_at: new Date(Date.now() - 120000).toISOString() },
      { user_message: 'Teşekkürler, düşüneyim', raw_response: '{"intent":"GENERAL","reply":"Rica ederim, istediğiniz zaman buradayım. Afiyet olsun!"}', confidence: 90, created_at: new Date(Date.now() - 60000).toISOString() },
    ];

    return {
      session: {
        id: sessionId,
        channel: isInstagram ? 'instagram' : isWhatsapp ? 'whatsapp' : 'phone',
        phone: isInstagram ? '05559876543' : isWhatsapp ? '05431234567' : '05321234567',
        status: 'completed',
        call_status: 'COMPLETED',
        call_duration: isInstagram ? null : 150,
        session_label: isInstagram ? null : isWhatsapp ? null : sessionId === '44444444-4444-4444-4444-444444444444' ? null : 'SESSION-20260722-0001',
        call_recording_url: sessionId === '33333333-3333-3333-3333-333333333333' ? 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' : null,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        ended_at: new Date(Date.now() - 3400000).toISOString(),
      },
      recording: isInstagram ? null : { recording_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
      transcript: isInstagram ? MOCK_INSTAGRAM : MOCK_AUDIT,
      whatsappMessages: isInstagram ? [] : MOCK_WHATSAPP,
    };
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
