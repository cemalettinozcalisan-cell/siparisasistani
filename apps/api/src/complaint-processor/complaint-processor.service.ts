import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';
import { TimelineService } from '../timeline/timeline.service';

export interface AiComplaintInput {
  tenantId: string;
  customer?: { name?: string; phone?: string };
  orderId?: string;
  complaintType: string;
  complaintSeverity: string;
  complaintConfidence: number;
  description: string;
  channel: string;
  sessionId?: string;
}

export interface ComplaintResult {
  ticketId: string;
  ticketNumber: string;
  status: string;
  severity: string;
}

@Injectable()
export class ComplaintProcessorService {
  private readonly logger = new Logger(ComplaintProcessorService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventBus: EventBusService,
    private readonly timeline: TimelineService,
  ) {}

  async process(input: AiComplaintInput): Promise<ComplaintResult> {
    const ticketNumber = await this.generateTicketNumber(input.tenantId);
    const ticketId = `CMP-${ticketNumber}`;

    const channelMap: Record<string, string> = {
      phone: 'VOICE', whatsapp: 'WHATSAPP', web: 'WEB', panel: 'PANEL',
    };
    const channel = channelMap[input.channel] || 'VOICE';

    // Timeline (entity_id null gönder, ticket ID metadata'da)
    await this.timeline.logEvent({
      tenantId: input.tenantId,
      entityType: 'complaint',
      entityId: undefined,
      eventType: 'COMPLAINT_OPEN',
      description: `⚠️ AI, ${input.customer?.name || 'Bilinmiyor'} için ${this.getSeverityLabel(input.complaintSeverity)} seviyede şikayet kaydı oluşturdu: ${input.description}`,
      metadata: {
        type: input.complaintType, severity: input.complaintSeverity,
        confidence: input.complaintConfidence, ticket_number: ticketNumber,
      },
      channel,
      actorType: 'AI',
    });

    // Event Bus
    this.eventBus.emit(SystemEvents.HUMAN_REQUIRED, input.tenantId, {
      entityType: 'complaint',
      ticketId,
      severity: input.complaintSeverity,
      description: input.description,
      customerName: input.customer?.name,
      customerPhone: input.customer?.phone,
      channel: input.channel,
      priority: input.complaintSeverity === 'CRITICAL' ? 'VERY_URGENT' : input.complaintSeverity === 'HIGH' ? 'URGENT' : 'NORMAL',
    });

    this.logger.log(`Ticket created: ${ticketId} (${input.complaintSeverity})`);

    return { ticketId, ticketNumber, status: 'OPEN', severity: input.complaintSeverity };
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
