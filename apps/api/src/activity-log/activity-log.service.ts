import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

export interface LogEntry {
  tenantId: string;
  entityType: string;
  entityId?: string;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown>;
  actorType?: string;
  actorId?: string;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async log(entry: LogEntry): Promise<void> {
    const { error } = await this.supabase.db.from('activity_logs').insert({
      tenant_id: entry.tenantId,
      entity_type: entry.entityType,
      entity_id: entry.entityId || null,
      event_type: entry.eventType,
      description: entry.description,
      metadata: entry.metadata || null,
      actor_type: entry.actorType || 'system',
      actor_id: entry.actorId || null,
    });

    if (error) {
      this.logger.error(`Activity log failed: ${error.message}`);
    }
  }

  async getByEntity(tenantId: string, entityType: string, entityId: string) {
    const { data } = await this.supabase.db
      .from('activity_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true });

    return data || [];
  }

  async getByTenant(tenantId: string, limit = 50) {
    const { data } = await this.supabase.db
      .from('activity_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  async getTimeline(tenantId: string, orderId: string) {
    const { data } = await this.supabase.db
      .from('activity_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('entity_id', orderId)
      .order('created_at', { ascending: true });

    return data || [];
  }
}
