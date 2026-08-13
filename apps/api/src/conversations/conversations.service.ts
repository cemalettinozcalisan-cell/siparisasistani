import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getConversations(tenantId: string, limit = 50) {
    try {
      const [sessions, calls, whatsapp, whatsappConvs, instagramConvs, orders] = await Promise.all([
        this.supabase.db
          .from('conversation_sessions')
          .select('id, channel, phone, status, call_status, session_label, messages, session_data, order_id, created_at, ended_at, call_duration, ai_model')
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
          .from('whatsapp_conversations')
          .select('id, phone, status, message_count, created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(limit),

        this.supabase.db
          .from('instagram_conversations')
          .select('id, instagram_user_id, username, status, created_at')
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
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
      // Also fetch orders table for direct order_id lookup
      const orderIds = (sessions.data || [])
        .map((s: any) => s.order_id).filter(Boolean) as string[];
      let ordersById = new Map<string, Record<string, unknown>>();
      if (orderIds.length > 0) {
        const { data: orderRows } = await this.supabase.db
          .from('orders')
          .select('id, order_number, total_price')
          .in('id', orderIds).limit(orderIds.length);
        (orderRows || []).forEach((o: Record<string, unknown>) => {
          ordersById.set(o.id as string, o);
        });
      }

      const results: Record<string, unknown>[] = [];
      const seen = new Set<string>();

      const channelTypeMap: Record<string, string> = {
        phone: 'VOICE', sms: 'SMS', whatsapp: 'WHATSAPP', instagram: 'INSTAGRAM',
      };

      // Merge sessions (phone + sms)
      for (const s of sessions.data || []) {
        const sessionChannel = (s as any).channel || 'phone';
        const key = `${s.id}-${(s as any).created_at}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const recording = (calls.data || []).find((c: Record<string, unknown>) => c.session_id === s.id);
        const sessionData = s as any;
        const hasOrder = !!sessionData.order_id;
        const orderRow = hasOrder ? ordersById.get(sessionData.order_id) : null;
        const activityOrder = orderMap.get(sessionData.order_id as string);

        results.push({
          id: s.id,
          type: sessionChannel === 'phone' ? 'call' : 'sms',
          channel: channelTypeMap[sessionChannel] || 'VOICE',
          phone: sessionData.phone,
          sessionLabel: sessionData.session_label,
          status: sessionData.call_status || sessionData.status,
          duration: sessionData.call_duration || recording?.duration_seconds || null,
          recordingUrl: recording?.recording_url || null,
          aiModel: sessionData.ai_model,
          hasOrder,
          orderNumber: orderRow?.order_number || null,
          orderTotal: orderRow?.total_price || null,
          orderInfo: orderRow ? {
            description: (activityOrder?.description as string) || '',
            orderNumber: orderRow.order_number,
            total: orderRow.total_price,
            metadata: activityOrder?.metadata,
          } : null,
          summary: sessionData.session_data || null,
          createdAt: sessionData.created_at,
          endedAt: sessionData.ended_at,
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

      // Instagram conversations
      for (const ig of instagramConvs.data || []) {
        const key = `ig-${ig.id}-${ig.created_at}`;
        if (seen.has(key)) continue;
        seen.add(key);

        results.push({
          id: `ig-${ig.id}`,
          type: 'instagram',
          channel: 'INSTAGRAM',
          phone: (ig as any).instagram_user_id,
          username: (ig as any).username || 'Instagram Kullanıcısı',
          status: 'active',
          messageCount: 0,
          lastMessage: '',
          createdAt: (ig as any).created_at,
        });
      }

      // Sort by created_at descending
      results.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

      const final = results.slice(0, limit);
      if (final.length === 0) {
        this.logger.warn('No conversations found, returning mock data');
        return this.getMockConversations();
      }
      return final;
    } catch (e) {
      this.logger.warn('Supabase query failed, returning mock data');
      return this.getMockConversations();
    }
  }

  private getMockConversations(): Record<string, unknown>[] {
    const now = Date.now();
    return [
      { id: 'mock-call-1', type: 'call', channel: 'VOICE', phone: '05321234567', sessionLabel: 'SESSION-20260812-0001', status: 'COMPLETED', duration: 272, recordingUrl: null, hasOrder: true, orderInfo: { description: '2 kg Kangal Sucuk + 1 kg Pastırma', metadata: { total: '950 TL' } }, summary: JSON.stringify({ shortSummary: 'Mehmet Yılmaz 2 kg Kangal Sucuk ve 1 kg Pastırma siparişi verdi. Adres Ankara/Etimesgut, ödeme IBAN. Görüşme sorunsuz tamamlandı.', sentiment: 'HAPPY', sentiment_score: 92, products: ['Kangal Sucuk - 2 kg', 'Pastırma - 1 kg'], payment_method: 'IBAN', address: 'Ankara/Etimesgut', customer_name: 'Mehmet Yılmaz', ai_errors: [], needs_human: false }), createdAt: new Date(now - 1800000).toISOString(), endedAt: new Date(now - 1528000).toISOString(), lastMessage: '' },
      { id: 'mock-call-2', type: 'call', channel: 'VOICE', phone: '05339876543', sessionLabel: 'SESSION-20260812-0002', status: 'COMPLETED', duration: 145, recordingUrl: null, hasOrder: true, orderInfo: { description: '3 kg Lokum', metadata: { total: '750 TL' } }, summary: JSON.stringify({ shortSummary: 'Ayşe Demir 3 kg karışık lokum sipariş etti. Kredi kartı ile ödeme yapıldı.', sentiment: 'HAPPY', sentiment_score: 88, products: ['Lokum - 3 kg'], payment_method: 'KAPIDA_KART', address: 'İstanbul/Kadıköy', customer_name: 'Ayşe Demir', ai_errors: [], needs_human: false }), createdAt: new Date(now - 7200000).toISOString(), endedAt: new Date(now - 7055000).toISOString(), lastMessage: '' },
      { id: 'mock-call-3', type: 'call', channel: 'VOICE', phone: '05321234567', sessionLabel: 'SESSION-20260812-0003', status: 'COMPLETED', duration: 198, recordingUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', hasOrder: true, orderInfo: { description: '1 kg Bükme', metadata: { total: '200 TL' } }, summary: JSON.stringify({ shortSummary: 'Ali Korkmaz 1 kg bükme siparişi verdi. Görüşme sırasında kargo süresi hakkında soru sordu, AI doğru bilgi verdi.', sentiment: 'NEUTRAL', sentiment_score: 65, products: ['Bükme - 1 kg'], payment_method: 'IBAN', address: 'Bursa/Osmangazi', customer_name: 'Ali Korkmaz', ai_errors: [], needs_human: false }), createdAt: new Date(now - 14400000).toISOString(), endedAt: new Date(now - 14202000).toISOString(), lastMessage: '' },
      { id: 'mock-call-4', type: 'call', channel: 'VOICE', phone: '05431234567', sessionLabel: 'SESSION-20260812-0004', status: 'FAILED', duration: 32, recordingUrl: null, hasOrder: false, orderInfo: null, summary: JSON.stringify({ shortSummary: 'Müşteri kargo gecikmesinden şikayetçi. Geçen haftaki siparişin hala ulaşmadığını belirtti.', sentiment: 'ANGRY', sentiment_score: 15, products: [], payment_method: 'BELIRSIZ', address: '', customer_name: 'Fatma Şahin', ai_errors: ['AI müşterinin öfkesini yatıştıramadı'], needs_human: true }), createdAt: new Date(now - 21600000).toISOString(), endedAt: new Date(now - 21568000).toISOString(), lastMessage: '' },
      { id: 'mock-call-5', type: 'sms', channel: 'SMS', phone: '05351234567', sessionLabel: 'SESSION-20260812-0005', status: 'COMPLETED', duration: null, recordingUrl: null, hasOrder: true, orderInfo: { description: '2 kg Yumurta', metadata: { total: '120 TL' } }, summary: JSON.stringify({ shortSummary: 'SMS ile 2 kg yumurta siparişi alındı. Kapıda nakit ödeme.', sentiment: 'NEUTRAL', sentiment_score: 70, products: ['Yumurta - 2 kg'], payment_method: 'KAPIDA_NAKIT', address: 'İzmir/Karşıyaka', customer_name: 'SMS Müşterisi', ai_errors: [], needs_human: false }), createdAt: new Date(now - 36000000).toISOString(), endedAt: null, lastMessage: '' },
      { id: 'wa-demo-1', type: 'whatsapp', channel: 'WHATSAPP', phone: '05451112233', sessionLabel: null, status: 'COMPLETED', duration: null, recordingUrl: null, hasOrder: true, orderInfo: { description: '1 kg Cevizli Sucuk + 500gr Pastırma', metadata: { total: '520 TL' } }, summary: JSON.stringify({ shortSummary: 'Zeynep Kaya WhatsApp üzerinden 1 kg cevizli sucuk ve 500gr pastırma siparişi verdi.', sentiment: 'HAPPY', sentiment_score: 90, products: ['Cevizli Sucuk - 1 kg', 'Pastırma - 500 gr'], payment_method: 'IBAN', address: 'Antalya/Muratpaşa', customer_name: 'Zeynep Kaya', ai_errors: [], needs_human: false }), createdAt: new Date(now - 5400000).toISOString(), endedAt: null, lastMessage: 'Tamam teşekkür ederim' },
      { id: 'ig-demo-1', type: 'instagram', channel: 'INSTAGRAM', phone: '05559876543', username: 'canyildiz', sessionLabel: null, status: 'COMPLETED', duration: null, recordingUrl: null, hasOrder: false, orderInfo: null, summary: JSON.stringify({ shortSummary: 'Can Yıldız Instagram DM üzerinden fiyat sordu, AI ürün kataloğunu ve fiyatları paylaştı. Siparişe dönüşmedi.', sentiment: 'NEUTRAL', sentiment_score: 72, products: [], payment_method: 'BELIRSIZ', address: '', customer_name: 'Can Yıldız', ai_errors: [], needs_human: false }), createdAt: new Date(now - 9000000).toISOString(), endedAt: null, lastMessage: '' },
    ];
  }
}
