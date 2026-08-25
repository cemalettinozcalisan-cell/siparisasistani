import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { AiProviderFactory } from '../ai/providers/ai-provider.factory';
import { SUPPORT_GUIDE } from './support-guide';

@Injectable()
export class SupportChatService {
  private readonly logger = new Logger(SupportChatService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly aiFactory: AiProviderFactory,
  ) {}

  /** Esnaf için sohbet geçmişi listesi (başlık + tarih, sıralı) */
  async listSessions(tenantId: string) {
    const { data } = await this.supabase.db
      .from('support_chat_sessions')
      .select('id, title, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(50);
    return data || [];
  }

  /** Bir sohbet oturumunun mesajlarını döner */
  async getSessionMessages(sessionId: string) {
    const { data } = await this.supabase.db
      .from('support_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    return data || [];
  }

  /** Yeni sohbet oturumu oluşturur */
  async createSession(tenantId: string, title?: string) {
    const { data } = await this.supabase.db
      .from('support_chat_sessions')
      .insert({ tenant_id: tenantId, title: title || 'Yeni Destek Sohbeti' })
      .select('*')
      .single();
    return data;
  }

  /** Sohbet mesajı kaydeder */
  private async addMessage(sessionId: string, sender: string, body: string) {
    await this.supabase.db.from('support_chat_messages').insert({ session_id: sessionId, sender, body });
  }

  /**
   * Esnafın mesajını işler: AI'a gönderir, gerekirse canlı veri erişimi sağlar,
   * cevabı kaydeder. Oturum yoksa yeni oluşturur ve başlık üretir.
   */
  async handleMessage(tenantId: string, sessionId: string | undefined, userMessage: string) {
    // Oturum yoksa oluştur
    if (!sessionId) {
      const created = await this.createSession(tenantId);
      sessionId = created.id as string;
    }

    // Kullanıcı mesajını kaydet
    await this.addMessage(sessionId, 'user', userMessage);

    // Geçmiş mesajları al (bağlam için son 20)
    const history = await this.getSessionMessages(sessionId);
    const historyText = history
      .slice(-20)
      .map((m) => `${m.sender === 'user' ? 'Esnaf' : 'Asistan'}: ${m.body}`)
      .join('\n');

    // AI çağrısı
    const reply = await this.generateReply(tenantId, historyText, userMessage);

    // AI cevabını kaydet
    await this.addMessage(sessionId, 'ai', reply);

    // Ek D: aciliyet tespiti — esnafın sorusunda kritik kelimeler varsa uyarı
    await this.detectUrgency(tenantId, userMessage, sessionId);

    // Başlık yoksa ilk mesajdan türet
    const { data: sess } = await this.supabase.db
      .from('support_chat_sessions')
      .select('title')
      .eq('id', sessionId)
      .single();
    if (!sess?.title || sess.title === 'Yeni Destek Sohbeti' || sess.title === '') {
      const derivedTitle = this.deriveTitle(userMessage);
      await this.supabase.db.from('support_chat_sessions').update({ title: derivedTitle, updated_at: new Date().toISOString() }).eq('id', sessionId);
    } else {
      await this.supabase.db.from('support_chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
    }

    return { sessionId, reply };
  }

  /** AI'a sistem verisi bağlamıyla cevap üretir (hem web chat hem telefon için) */
  async generateReply(tenantId: string, historyText: string, userMessage: string): Promise<string> {
    // Esnafın canlı veri özeti (okuma-yalnızca, tenant izole)
    const dataSummary = await this.buildDataSummary(tenantId);

    const systemPrompt = `${SUPPORT_GUIDE}

## CANLI İŞLETME VERİSİ (OKUMA-YALNIZCA - yalnızca bu özetten yararlan)
Aşağıda esnafın işletmesine ait GÜNCEL veri özeti var. Bu veriyi okuyup esnafa somut yardım edebilirsin.
${dataSummary || '(Veri bulunamadı)'}

## GÖREV
Esnafın sorusunu yukarıdaki rehber + canlı veri özetine göre yanıtla. Kibarca, sade ve adım adım açıkla.
Veriye bakmak gerekiyorsa zaten yukarıda özeti var; ayrıca izin isteme yalnızca "spesifik bir kaydı" görmek gerektiğinde gerekir (örn. hangi sipariş).`;

    const userPrompt = `Konuşma geçmişi:\n${historyText || '(yeni sohbet)'}\n\nEsnafın yeni mesajı: ${userMessage}`;

    try {
      const provider = this.aiFactory.getProvider();
      const result = await provider.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      });
      return result.content || 'Size nasıl yardımcı olabilirim?';
    } catch (e) {
      this.logger.error(`Support AI failed: ${(e as Error).message}`);
      return 'Şu anda size yardımcı olamıyorum, lütfen kısa süre sonra tekrar deneyin.';
    }
  }

  /** Esnafın canlı veri özeti (tenant izole, okuma-yalnızca) */
  private async buildDataSummary(tenantId: string): Promise<string> {
    const sections: string[] = [];

    try {
      const { data: orders } = await this.supabase.db
        .from('orders')
        .select('id, order_number, status, total_price, customer_name, created_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);
      if (orders?.length) {
        const openCount = orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length;
        sections.push(`Son 10 sipariş (${openCount} aktif görünüyor): ${orders.map((o) => `#${o.order_number} (${o.status}, ${Number(o.total_price || 0)} TL, ${o.customer_name || '?'})`).join(', ')}`);
      }
    } catch { /* sessiz */ }

    try {
      const { count: customerCount } = await this.supabase.db
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);
      sections.push(`Müşteri sayısı: ${customerCount || 0}`);
    } catch { /* sessiz */ }

    try {
      const { data: products } = await this.supabase.db
        .from('products')
        .select('product_name, price, unit')
        .eq('tenant_id', tenantId)
        .limit(20);
      if (products?.length) sections.push(`Ürünler: ${products.map((p) => `${p.product_name} (${Number(p.price || 0)} TL/${p.unit})`).join(', ')}`);
    } catch { /* sessiz */ }

    try {
      const { count: pendingCalls } = await this.supabase.db
        .from('conversation_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'active');
      sections.push(`Aktif görüşme sayısı: ${pendingCalls || 0}`);
    } catch { /* sessiz */ }

    return sections.join('\n');
  }

  private async getTenantName(tenantId: string): Promise<string> {
    try {
      const { data } = await this.supabase.db.from('tenants').select('company_name').eq('id', tenantId).single();
      return data?.company_name || 'Esnaf';
    } catch {
      return 'Esnaf';
    }
  }

  /** Ek D: Esnafın sorusunda aciliyet kelimeleri varsa yüksek öncelikli bildirim üretir */
  async detectUrgency(tenantId: string, message: string, sessionId: string): Promise<void> {
    const lower = message.toLowerCase();
    const urgencyWords = [
      'çalışmıyor', 'çalişmiyor', 'düşmüyor', 'dusmuyor', 'kayboldu', 'bozuldu',
      'hata veriyor', 'hata', 'acil', 'için aradım', 'göremiyorum', 'dinleyemiyorum',
      'açılmıyor', 'acilmiyor', 'olmuyor', 'yok', 'gitti', 'çalışmadı', 'gitmiyor',
    ];
    if (!urgencyWords.some((w) => lower.includes(w))) return;

    // Aynı tenant için kısa süre içinde tekrar bildirim üretme (spam önleme)
    const { data: recent } = await this.supabase.db
      .from('notifications')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('type', 'support_urgent')
      .gte('created_at', new Date(Date.now() - 10 * 60000).toISOString())
      .limit(1);
    if (recent && recent.length > 0) return;

    const alertMessage = `🔴 Acil Destek: esnaf "${message.substring(0, 120)}"`;
    const tenantName = await this.getTenantName(tenantId);

    // 1) Panel bildirimi
    await this.supabase.db.from('notifications').insert({
      tenant_id: tenantId,
      type: 'support_urgent',
      title: '🔴 Acil Destek Talebi',
      message: alertMessage,
      status: 'unread',
    });

    // 2) AlertRouter dış bildirimi (e-posta/WhatsApp/SMS) için channel_health_alerts'e yaz
    // AlertRouter, external_notified=false olan bu kaydı yakalayıp owner'a dışarıdan bildirir.
    await this.supabase.db.from('channel_health_alerts').insert({
      tenant_id: tenantId,
      channel: 'support',
      alert_type: 'SUPPORT_URGENT',
      message: `${tenantName}: ${message.substring(0, 200)}`,
    });

    this.logger.log(`Urgent support flagged for tenant ${tenantId} (session ${sessionId})`);
  }

  /** İlk mesajdan sohbet başlığı türetir */
  private deriveTitle(message: string): string {
    const s = message.trim();
    if (s.length > 40) return s.substring(0, 40) + '...';
    return s || 'Destek Sohbeti';
  }
}
