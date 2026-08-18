import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';
import { TimelineService } from '../timeline/timeline.service';

export interface AiComplaintInput {
  tenantId: string;
  customer?: { name?: string; phone?: string };
  orderId?: string;
  complaintType?: string;
  complaintSeverity?: string;
  complaintConfidence?: number;
  description: string;
  channel: string;
  sessionId?: string;
}

export interface ComplaintResult {
  ticketId: string;
  ticketNumber: string;
  status: string;
  severity: string;
  created: boolean;
}

const SEVERITY_MAP: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
  LOW: 'low', NORMAL: 'medium', HIGH: 'high', CRITICAL: 'critical',
};

/**
 * Birleşik Şikayet Hattı (Unified Complaint Line)
 *
 * Tüm kanallardan (telefon, SMS, WhatsApp, Instagram, panel) gelen şikayetlerin
 * TEK giriş noktası. Yaptıkları:
 *   1. complaints tablosuna kayıt (esnaf için kalıcı şikayet kaydı)
 *   2. Timeline COMPLAINT_OPEN kaydı
 *   3. HUMAN_REQUIRED event'i → panel bildirimi (notifications) + WhatsApp grubu
 *      (ai_events) + yazıcı (print_jobs) — NotificationService üzerinden
 */
@Injectable()
export class ComplaintProcessorService {
  private readonly logger = new Logger(ComplaintProcessorService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventBus: EventBusService,
    private readonly timeline: TimelineService,
  ) {}

  async process(input: AiComplaintInput): Promise<ComplaintResult> {
    // Oturum başına TEK şikayet (aynı konuşmada tekrar tekrar kayıt oluşmasın)
    if (input.sessionId) {
      const { data: existing } = await this.supabase.db
        .from('complaints')
        .select('id, ticket_number')
        .eq('tenant_id', input.tenantId)
        .eq('session_id', input.sessionId)
        .maybeSingle();

      if (existing) {
        return {
          ticketId: existing.id as string,
          ticketNumber: String(existing.ticket_number || ''),
          status: 'OPEN',
          severity: String(input.complaintSeverity || 'NORMAL').toUpperCase(),
          created: false,
        };
      }
    }

    const ticketNumber = await this.generateTicketNumber(input.tenantId);
    const ticketId = `CMP-${ticketNumber}`;
    const channel = input.channel || 'phone';

    const channelMap: Record<string, string> = {
      phone: 'VOICE', whatsapp: 'WHATSAPP', instagram: 'INSTAGRAM', sms: 'SMS', web: 'WEB', panel: 'PANEL',
    };
    const channelLabel = channelMap[channel] || 'VOICE';

    const severityKey = String(input.complaintSeverity || 'NORMAL').toUpperCase();
    const priority = severityKey === 'CRITICAL' ? 'high' : severityKey === 'HIGH' ? 'high' : 'medium';

    // 1) Kalıcı şikayet kaydı
    const { data: complaint, error } = await this.supabase.db
      .from('complaints')
      .insert({
        tenant_id: input.tenantId,
        session_id: input.sessionId || null,
        ticket_number: ticketNumber,
        channel,
        source: 'ai',
        customer_name: input.customer?.name || null,
        customer_phone: input.customer?.phone || null,
        category: input.complaintType || 'general',
        severity: SEVERITY_MAP[severityKey] || 'medium',
        priority,
        description: input.description,
        status: 'open',
        order_id: input.orderId || null,
      })
      .select('id')
      .single();

    if (error) {
      this.logger.error(`Complaint insert failed: ${error.message}`);
    }

    // 2) Timeline kaydı
    await this.timeline.logEvent({
      tenantId: input.tenantId,
      entityType: 'complaint',
      entityId: undefined,
      eventType: 'COMPLAINT_OPEN',
      description: `⚠️ AI, ${input.customer?.name || 'Bilinmiyor'} için ${this.getSeverityLabel(severityKey)} seviyede şikayet kaydı oluşturdu: ${input.description}`,
      metadata: {
        type: input.complaintType, severity: severityKey,
        confidence: input.complaintConfidence, ticket_number: ticketNumber,
      },
      channel: channelLabel,
      actorType: 'AI',
    });

    // 3) Event Bus → panel bildirimi + WhatsApp grubu + yazıcı
    this.eventBus.emit(SystemEvents.HUMAN_REQUIRED, input.tenantId, {
      entityType: 'complaint',
      ticketId,
      ticketNumber,
      severity: severityKey,
      description: input.description,
      customerName: input.customer?.name,
      customerPhone: input.customer?.phone,
      channel: channelLabel,
      priority: severityKey === 'CRITICAL' ? 'VERY_URGENT' : severityKey === 'HIGH' ? 'URGENT' : 'NORMAL',
    }, input.orderId);

    this.logger.log(`Ticket created: ${ticketId} (${severityKey}) via ${channel}`);
    const finalId = (complaint?.id as string) || ticketId;

    return { ticketId: finalId, ticketNumber, status: 'OPEN', severity: severityKey, created: true };
  }

  private async generateTicketNumber(tenantId: string): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const { count } = await this.supabase.db
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('event_type', 'COMPLAINT_OPEN')
      .gte('created_at', new Date().toISOString().slice(0, 10));

    const seq = ((count || 0) + 1).toString().padStart(4, '0');
    return `${dateStr}-${seq}`;
  }

  private getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      LOW: 'Düşük', NORMAL: 'Normal', HIGH: 'Yüksek', CRITICAL: 'Kritik',
    };
    return labels[severity] || 'Normal';
  }
}