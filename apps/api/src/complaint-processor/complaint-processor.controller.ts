import { Controller, Post, Get, Patch, Body, Param, Logger } from '@nestjs/common';
import { ComplaintProcessorService, AiComplaintInput } from './complaint-processor.service';
import { SupabaseService } from '../common/supabase.client';
import { TimelineService } from '../timeline/timeline.service';

@Controller('complaints')
export class ComplaintProcessorController {
  private readonly logger = new Logger(ComplaintProcessorController.name);

  constructor(
    private readonly processor: ComplaintProcessorService,
    private readonly supabase: SupabaseService,
    private readonly timeline: TimelineService,
  ) {}

  @Post('create-from-ai')
  async createFromAi(@Body() body: AiComplaintInput) {
    return this.processor.process(body);
  }

  /** "Talep & İstek" listesi — complaints tablosundan, müşteri bilgisiyle zenginleştirilmiş */
  @Get(':tenantId')
  async list(@Param('tenantId') tenantId: string) {
    const { data, error } = await this.supabase.db
      .from('complaints')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      this.logger.error(`Complaint list failed: ${error.message}`);
      return { success: false, message: error.message };
    }

    const rows = (data || []) as Record<string, any>[];

    // Telefon ile müşteri adres/şehir eşleştir
    const phones = [...new Set(rows.map((r) => String(r.customer_phone || '').trim()).filter(Boolean))];
    let customerIndex: Record<string, Record<string, unknown>> = {};
    if (phones.length) {
      const { data: custRows } = await this.supabase.db
        .from('customers')
        .select('phone, name, address, city')
        .in('phone', phones);
      for (const row of custRows || []) {
        customerIndex[String((row as any).phone)] = row as Record<string, unknown>;
      }
    }

    return rows.map((r) => {
      const cust = customerIndex[String(r.customer_phone || '').trim()] || {};
      return {
        id: r.id,
        ticket_number: r.ticket_number || '',
        channel: r.channel || 'phone',
        category: r.category || 'general',
        status: r.status || 'open', // open | resolved
        severity: String(r.severity || 'medium').toUpperCase(),
        description: r.description || '',
        session_id: r.session_id || null,
        customer_name: r.customer_name || String(cust.name || ''),
        customer_phone: r.customer_phone || '',
        customer_address: String(cust.address || ''),
        customer_city: String(cust.city || ''),
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });
  }

  /**
   * "Çözüldü Olarak İşaretle" — esnaf notu müşteriye otomatik gönderilir.
   * WhatsApp'tan geldiyse WhatsApp'a, değilse SMS'e (outbound kuyruğu).
   */
  @Patch(':id/resolve')
  async resolve(@Param('id') id: string, @Body() body: { tenantId: string; note?: string }) {
    const { tenantId, note } = body;
    if (!tenantId || !id) return { success: false, message: 'tenantId ve id zorunlu.' };

    try {
      const { data: complaint } = await this.supabase.db
        .from('complaints')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!complaint) return { success: false, message: 'Talep bulunamadı.' };

      await this.supabase.db
        .from('complaints')
        .update({ status: 'resolved', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      // Timeline: çözüldü
      await this.timeline.logEvent({
        tenantId,
        entityType: 'complaint',
        entityId: id,
        eventType: 'COMPLAINT_RESOLVED',
        description: `Talep çözüldü${note ? ` — Not: ${note}` : ''} (${complaint.customer_name || 'Bilinmiyor'})`,
        metadata: { ticket_number: complaint.ticket_number, note: note || null },
        channel: 'SYSTEM',
        actorType: 'STAFF',
      });

      // Müşteriye mesaj gönder (not varsa)
      if (note && complaint.customer_phone) {
        const ch = String(complaint.channel || 'phone').toLowerCase();
        const message = `Merhaba ${complaint.customer_name || ''}, talebiniz çözümlenmiştir. ${note}`.trim();
        if (ch === 'whatsapp') {
          await this.supabase.db.from('whatsapp_messages').insert({
            tenant_id: tenantId,
            conversation_id: null,
            direction: 'outgoing',
            message,
            body: message,
            status: 'queued',
          });
        } else {
          await this.supabase.db.from('outbound_logs').insert({
            tenant_id: tenantId,
            channel: 'sms',
            direction: 'outgoing',
            recipient: complaint.customer_phone,
            body: message,
            status: 'queued',
            reference_type: 'complaint',
          });
        }
        this.logger.log(`Resolve note queued to ${ch} for ${complaint.customer_phone}`);
      }

      return { success: true };
    } catch (err) {
      this.logger.error(`Complaint resolve failed: ${(err as Error).message}`);
      return { success: false, message: `Çözülürken hata: ${(err as Error).message}` };
    }
  }
}
