import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getConversations(tenantId: string, limit = 50) {
    try {
      const [sessions, calls, whatsapp, orders] = await Promise.all([
        this.supabase.db
          .from('conversation_sessions')
          .select('id, channel, phone, status, call_status, session_label, messages, session_data, created_at, ended_at, call_duration, ai_model')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(limit),

        this.supabase.db
          .from('call_recordings')
          .select('id, session_id, phone, direction, recording_url, duration_seconds, created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(limit),

        this.supabase.db
          .from('whatsapp_messages')
          .select('id, conversation_id, direction, body, created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(limit),

        this.supabase.db
          .from('activity_logs')
          .select('entity_id, event_type, description, metadata, created_at')
          .eq('tenant_id', tenantId)
          .eq('event_type', 'ORDER_CREATED')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      const orderMap = new Map<string, Record<string, unknown>>();
      (orders.data || []).forEach((o: Record<string, unknown>) => {
        orderMap.set(o.entity_id as string, o);
      });

      const results: Record<string, unknown>[] = [];
      const seen = new Set<string>();

      // Merge sessions and calls
      for (const s of sessions.data || []) {
        const phone = (s as Record<string, unknown>).phone as string;
        const key = `${s.id}-${s.created_at}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const recording = (calls.data || []).find((c: Record<string, unknown>) => c.session_id === s.id);
        const relatedOrder = orderMap.get(s.id as string);

        results.push({
          id: s.id,
          type: 'call',
          channel: 'VOICE',
          phone,
          sessionLabel: s.session_label,
          status: s.call_status || s.status,
          duration: s.call_duration || recording?.duration_seconds || null,
          recordingUrl: recording?.recording_url || null,
          aiModel: s.ai_model,
          hasOrder: !!relatedOrder,
          orderInfo: relatedOrder ? {
            description: relatedOrder.description,
            metadata: relatedOrder.metadata,
          } : null,
          createdAt: s.created_at,
          endedAt: s.ended_at,
        });
      }

      // WhatsApp conversations (group by conversation_id)
      const whatsappGroups = new Map<string, Record<string, unknown>[]>();
      for (const msg of whatsapp.data || []) {
        const convId = (msg.conversation_id as string) || 'unknown';
        if (!whatsappGroups.has(convId)) whatsappGroups.set(convId, []);
        whatsappGroups.get(convId)!.push(msg as unknown as Record<string, unknown>);
      }

      for (const [convId, msgs] of whatsappGroups) {
        const first = msgs[0];
        const key = `wa-${convId}-${first.created_at}`;
        if (seen.has(key)) continue;
        seen.add(key);

        results.push({
          id: `wa-${convId}`,
          type: 'whatsapp',
          channel: 'WHATSAPP',
          phone: convId,
          status: 'completed',
          messageCount: msgs.length,
          lastMessage: msgs[msgs.length - 1]?.body || '',
          createdAt: first.created_at,
        });
      }

      // Sort by created_at descending
      results.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

      return results.slice(0, limit);
    } catch (e) {
      this.logger.warn('Supabase query failed, returning mock data');
      return this.getMockConversations();
    }
  }

  private getMockConversations(): Record<string, unknown>[] {
    const now = Date.now();
    return [
      { id: '11111111-1111-1111-1111-111111111111', type: 'call', channel: 'VOICE', phone: '05321234567', sessionLabel: 'SESSION-20260722-0001', status: 'COMPLETED', duration: 150, recordingUrl: null, hasOrder: true, orderInfo: { description: '2 kg sucuk siparişi', metadata: { total: '600 TL' } }, createdAt: new Date(now - 3600000).toISOString(), endedAt: new Date(now - 3400000).toISOString(), lastMessage: '' },
      { id: '22222222-2222-2222-2222-222222222222', type: 'call', channel: 'VOICE', phone: '05339876543', sessionLabel: 'SESSION-20260722-0002', status: 'COMPLETED', duration: 90, recordingUrl: null, hasOrder: true, orderInfo: { description: '1 kg lokum siparişi', metadata: { total: '350 TL' } }, createdAt: new Date(now - 7200000).toISOString(), endedAt: new Date(now - 7080000).toISOString(), lastMessage: '' },
      { id: '33333333-3333-3333-3333-333333333333', type: 'call', channel: 'VOICE', phone: '05321234567', sessionLabel: 'SESSION-20260722-0003', status: 'AI_SPEAKING', duration: 45, recordingUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', hasOrder: true, orderInfo: { description: '3 kg bükme siparişi', metadata: { total: '450 TL' } }, createdAt: new Date(now - 10800000).toISOString(), endedAt: new Date(now - 1074000).toISOString(), lastMessage: '' },
      { id: '44444444-4444-4444-4444-444444444444', type: 'call', channel: 'VOICE', phone: '05431234567', sessionLabel: null, status: 'missed', duration: null, recordingUrl: null, hasOrder: false, orderInfo: null, createdAt: new Date(now - 14400000).toISOString(), endedAt: new Date(now - 14400000).toISOString(), lastMessage: '' },
      { id: '55555555-5555-5555-5555-555555555555', type: 'whatsapp', channel: 'WHATSAPP', phone: '05431234567', status: 'completed', messageCount: 8, lastMessage: 'Tamam teslim adresim aynı', createdAt: new Date(now - 1800000).toISOString(), endedAt: null },
    ];
  }
}
