import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { ChannelHealthService } from '../channel-health/channel-health.service';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly channelHealth: ChannelHealthService,
  ) {}

  async list(tenantId: string, status?: string) {
    let query = this.supabase.db
      .from('support_tickets')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) this.logger.error(`Support list failed: ${error.message}`);
    return data || [];
  }

  async get(tenantId: string, id: string) {
    const { data: ticket } = await this.supabase.db
      .from('support_tickets')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();

    const { data: messages } = await this.supabase.db
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    return { ...ticket, messages: messages || [] };
  }

  async create(tenantId: string, body: { subject: string; category?: string; description?: string; priority?: string }) {
    const ticketNumber = await this.generateTicketNumber(tenantId);
    const { data, error } = await this.supabase.db
      .from('support_tickets')
      .insert({
        tenant_id: tenantId,
        ticket_number: ticketNumber,
        subject: body.subject,
        category: body.category || 'other',
        description: body.description || null,
        priority: body.priority || 'medium',
        status: 'open',
        created_by: 'staff',
      })
      .select('*')
      .single();

    if (error) {
      this.logger.error(`Support create failed: ${error.message}`);
      throw new Error(error.message);
    }
    return data;
  }

  async addMessage(tenantId: string, id: string, body: { sender?: string; message: string }) {
    // Bilet sahipliğini doğrula
    const { data: ticket } = await this.supabase.db
      .from('support_tickets')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();
    if (!ticket) return null;

    const { data, error } = await this.supabase.db
      .from('support_ticket_messages')
      .insert({ ticket_id: id, sender: body.sender || 'staff', body: body.message })
      .select('*')
      .single();

    // Mesaj gelince bileti tekrar "open" yap (yanıt bekliyor)
    await this.supabase.db
      .from('support_tickets')
      .update({ status: 'open', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) this.logger.error(`Support message failed: ${error.message}`);
    return data || null;
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'resolved' || status === 'closed') patch.resolved_at = new Date().toISOString();
    const { data, error } = await this.supabase.db
      .from('support_tickets')
      .update(patch)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) this.logger.error(`Support status failed: ${error.message}`);
    return data;
  }

  /**
   * AI destek ön-tanısı (2B): esnafın bildirdiği kanal sorununu
   * channel_health verisiyle çapraz kontrol edip teşhis üretir.
   * AI yalnızca TEŞHİS + yönlendirme yapar; değişiklik insan onayına kalır.
   */
  async runAIDiagnosis(tenantId: string, id: string) {
    const { data: ticket } = await this.supabase.db
      .from('support_tickets')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();
    if (!ticket) return null;

    const { channels, open_alerts } = await this.channelHealth.getTenantHealth(tenantId);

    // Kategori -> kanal eşlemesi
    const catChannel: Record<string, string> = {
      telefon: 'phone', whatsapp: 'whatsapp', instagram: 'instagram', sms: 'sms', web: 'website', website: 'website',
    };
    const channel = catChannel[String(ticket.category || '').toLowerCase()] || null;

    const ch = channel ? (channels as Record<string, any>)[channel] : null;
    let diagnosis: string;

    if (ch && ch.status === 'degraded') {
      const lastErr = ch.last_error || 'bilinmiyor';
      diagnosis = `${channel} kanalında bağlantı sorunu tespit edildi. Son hata: ${lastErr}. Son başarılı işlem: ${ch.last_success_at ? new Date(ch.last_success_at).toLocaleString('tr-TR') : 'kayıt yok'}. Lütfen bağlantıyı kontrol edin / yenileyin.`;
    } else if (ch && ch.status === 'down') {
      diagnosis = `${channel} kanalında kesinti var. Son hata: ${ch.last_error || 'bilinmiyor'}. Teknik ekip müdahalesi gerekli.`;
    } else if (ch && ch.status === 'ok') {
      diagnosis = `${channel} kanalınız şu anda çalışıyor görünüyor. Son başarılı işlem: ${ch.last_success_at ? new Date(ch.last_success_at).toLocaleString('tr-TR') : 'kayıt yok'}. Sorun süreklerse teknik ekibe bildirin.`;
    } else {
      diagnosis = `Bu kanal için henüz sağlık verisi bulunmuyor. Manuel kontrol gerekli.`;
    }

    const { data, error } = await this.supabase.db
      .from('support_tickets')
      .update({ ai_diagnosis: diagnosis, ai_diagnosed: true, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .single();

    // Teşhisi yazışmaya ekle (AI mesajı)
    if (data) {
      await this.supabase.db.from('support_ticket_messages').insert({
        ticket_id: id, sender: 'ai', body: `🤖 AI Teşhis: ${diagnosis}`,
      });
    }

    if (error) this.logger.error(`AI diagnosis failed: ${error.message}`);
    return data;
  }

  private async generateTicketNumber(tenantId: string): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const { count } = await this.supabase.db
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', new Date().toISOString().slice(0, 10));

    const seq = ((count || 0) + 1).toString().padStart(4, '0');
    return `${dateStr}-${seq}`;
  }
}
