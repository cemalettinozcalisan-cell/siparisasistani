import { Injectable, Logger } from '@nestjs/common';
import { AiOrderInput } from '@siparis/types';

export interface ParsedResponse {
  reply?: string;
  intent?: string;
  customer?: { name?: string; phone?: string };
  products?: { product_name?: string; quantity?: number; unit?: string }[];
  address?: string;
  payment?: string;
  confirmed?: boolean;
  confidence?: number;
  conversationConfidence?: number;
  orderConfidence?: number;
  totalPrice?: number;
  paymentStatus?: string;
  conversationStage?: string;
  customerType?: string;
  needPayment?: boolean;
  needAddress?: boolean;
  needPhone?: boolean;
  campaignOffered?: boolean;
  campaignId?: string;
  reasoningSummary?: string;
  emotion?: string;
  emotionConfidence?: number;
  customerSentiment?: number;
  priority?: string;
  complaintType?: string;
  complaintConfidence?: number;
  complaintSeverity?: string;
  complaintStatus?: string;
  ticketId?: string;
  assignedTo?: string;
  callbackRequired?: boolean;
  slaMinutes?: number;
  escalationLevel?: number;
  escalationReason?: string;
  canResolve?: boolean;
  complaintCount?: number;
  crmAction?: string;
  recommendedAction?: string;
  channel?: string;
  needHuman?: boolean;
  nextAction?: string;
}

@Injectable()
export class AiParserService {
  private readonly logger = new Logger(AiParserService.name);

  parseAiResponse(content: string): ParsedResponse {
    const json = this.extractJson(content);

    if (!json) {
      return {
        reply: content,
        confirmed: false,
        confidence: 0,
      };
    }

    const j = json as Record<string, unknown>;
    return {
      reply: (j.reply as string) || content,
      intent: j.intent as string,
      customer: j.customer as { name?: string; phone?: string },
      products: j.products as { product_name?: string; quantity?: number; unit?: string }[],
      address: j.address as string,
      payment: j.payment as string,
      confirmed: (j.confirmed as boolean) || false,
      confidence: this.normalizeConfidence(j.conversation_confidence || j.confidence || 0),
      conversationConfidence: this.normalizeConfidence(j.conversation_confidence || j.confidence || 0),
      orderConfidence: this.normalizeConfidence(j.order_confidence || 0),
      totalPrice: j.total_price as number,
      paymentStatus: j.payment_status as string,
      conversationStage: j.conversation_stage as string,
      customerType: j.customer_type as string,
      needPayment: j.need_payment as boolean,
      needAddress: j.need_address as boolean,
      needPhone: j.need_phone as boolean,
      campaignOffered: j.campaign_offered as boolean,
      campaignId: j.campaign_id as string,
      reasoningSummary: j.reasoning_summary as string,
      emotion: j.emotion as string,
      emotionConfidence: this.normalizeConfidence(j.emotion_confidence || 0),
      customerSentiment: Number(j.customer_sentiment || 0),
      priority: j.priority as string,
      complaintType: j.complaint_type as string,
      complaintConfidence: this.normalizeConfidence(j.complaint_confidence || 0),
      complaintSeverity: j.complaint_severity as string,
      complaintStatus: j.complaint_status as string,
      ticketId: j.ticket_id as string,
      assignedTo: j.assigned_to as string,
      callbackRequired: j.callback_required as boolean,
      slaMinutes: Number(j.sla_minutes || 0),
      escalationLevel: Number(j.escalation_level || 1),
      escalationReason: j.escalation_reason as string,
      canResolve: j.can_resolve as boolean,
      complaintCount: Number(j.complaint_count || 0),
      crmAction: j.crm_action as string,
      recommendedAction: j.recommended_action as string,
      channel: j.channel as string,
      needHuman: j.need_human as boolean,
      nextAction: j.next_action as string,
    };
  }

  extractJson(text: string): Record<string, unknown> | null {
    const patterns = [
      /```(?:json)?\s*([\s\S]*?)```/,
      /{[\s\S]*"reply"[\s\S]*}/,
      /{[\s\S]*"intent"[\s\S]*}/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const jsonStr = match[1] || match[0];
        try {
          return JSON.parse(jsonStr);
        } catch {
          continue;
        }
      }
    }
    return null;
  }

  toOrderInput(parsed: ParsedResponse, channel: 'phone' | 'whatsapp' | 'sms'): AiOrderInput {
    return {
      customer: {
        name: parsed.customer?.name || '',
        phone: parsed.customer?.phone || '',
        address: parsed.address,
      },
      products: (parsed.products || []).map((p) => ({
        product_name: p.product_name || '',
        quantity: p.quantity || 0,
        unit: p.unit || 'KG',
      })),
      payment: this.mapPayment(parsed.payment),
      confirmed: parsed.confirmed || false,
      confidence: parsed.orderConfidence || parsed.confidence || 0,
      channel,
    };
  }

  private mapPayment(payment?: string): AiOrderInput['payment'] {
    const map: Record<string, AiOrderInput['payment']> = {
      IBAN: 'iban', CASH: 'iban', CARD: 'website', PAYTR: 'paytr',
      iban: 'iban', website: 'website', paytr: 'paytr', iyzico: 'iyzico',
    };
    return map[payment || ''] || 'iban';
  }

  private normalizeConfidence(value: unknown): number {
    const num = Number(value);
    if (isNaN(num)) return 0;
    if (num > 1) return Math.min(num, 100);
    return Math.round(num * 100);
  }
}
