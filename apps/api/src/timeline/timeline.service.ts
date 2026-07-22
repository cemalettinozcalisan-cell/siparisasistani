import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

const EVENT_ICONS: Record<string, string> = {
  CALL_RECEIVED: '📞', MESSAGE_RECEIVED: '💬', ORDER_CREATED: '🛒',
  PAYMENT_WAITING: '💳', PAYMENT_CONFIRMED: '✅', PACKAGING: '📦',
  PACKAGED: '📦', SHIPPED: '🚚', DELIVERED: '✅',
  COMPLETED: '🎉', CANCELLED: '❌',
  CAMPAIGN_OFFERED: '🏷️', CAMPAIGN_ACCEPTED: '🎯',
  HUMAN_TRANSFER: '👤', COMPLAINT_OPEN: '⚠️', COMPLAINT_RESOLVED: '🔧',
  CALLBACK_SCHEDULED: '📅', WHATSAPP_SENT: '📲',
  STATUS_NEW: '🆕', STATUS_PAYMENT_PENDING: '⏳', STATUS_PAYMENT_CONFIRMED: '✅',
  STATUS_PACKAGING: '📦', STATUS_PACKAGED: '📦', STATUS_SHIPPED: '🚚',
  STATUS_DELIVERED: '✅', STATUS_COMPLETED: '🎉',
  STATUS_CANCELLED: '❌', STATUS_REFUNDED: '💰',
};

const ACTOR_ICONS: Record<string, string> = {
  AI: '🤖', CUSTOMER: '👤', STAFF: '👨‍💼', SYSTEM: '⚙️',
};

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getOrderTimeline(tenantId: string, orderId: string) {
    const { data } = await this.supabase.db
      .from('activity_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('entity_id', orderId)
      .order('created_at', { ascending: true });

    return (data || []).map((entry: Record<string, unknown>) => this.enrich(entry));
  }

  async getCustomerTimeline(tenantId: string, customerId: string) {
    // Get all orders for this customer
    const { data: orders } = await this.supabase.db
      .from('orders')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId);

    const orderIds = (orders || []).map((o: { id: string }) => o.id);

    if (orderIds.length === 0) return [];

    const { data } = await this.supabase.db
      .from('activity_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('entity_id', orderIds)
      .order('created_at', { ascending: false })
      .limit(100);

    return (data || []).map((entry: Record<string, unknown>) => this.enrich(entry));
  }

  async getRecentActivity(tenantId: string, limit = 50) {
    const { data } = await this.supabase.db
      .from('activity_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data || []).map((entry: Record<string, unknown>) => this.enrich(entry));
  }

  async logEvent(params: {
    tenantId: string; entityType: string; entityId?: string;
    eventType: string; description: string; metadata?: Record<string, unknown>;
    channel?: string; actorType?: string; actorId?: string;
  }) {
    const eventIcon = EVENT_ICONS[params.eventType] || '📋';
    const actorType = params.actorType || 'SYSTEM';

    await this.supabase.db.from('activity_logs').insert({
      tenant_id: params.tenantId,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      event_type: params.eventType,
      description: params.description,
      metadata: params.metadata || null,
      channel: params.channel || 'SYSTEM',
      event_icon: eventIcon,
      actor_type: actorType,
      actor_id: params.actorId || null,
    });
  }

  private enrich(entry: Record<string, unknown>) {
    const eventType = (entry.event_type as string) || '';
    const actorType = (entry.actor_type as string) || 'SYSTEM';
    const desc = (entry.description as string) || '';
    const hasIcon = /^[^\w\s]{1,2}\s/.test(desc);
    return {
      ...entry,
      icon: entry.event_icon || EVENT_ICONS[eventType] || (hasIcon ? '' : '📋'),
      actorIcon: ACTOR_ICONS[actorType] || '⚙️',
    };
  }
}
