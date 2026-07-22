import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getConversations(tenantId: string, limit = 50) {
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
  }
}
