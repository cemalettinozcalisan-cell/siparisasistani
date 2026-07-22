import { Injectable } from '@nestjs/common';
import { NotificationHandler } from './base.handler';
import { SystemEvent } from '../../event-bus/event-bus.service';
import { SupabaseService } from '../../common/supabase.client';

@Injectable()
export class ComplaintHandler implements NotificationHandler {
  readonly eventType = 'HUMAN_REQUIRED';

  constructor(private readonly supabase: SupabaseService) {}

  async handle(event: SystemEvent): Promise<void> {
    const p = event.payload as Record<string, unknown>;
    await this.supabase.db.from('notifications').insert({
      tenant_id: event.tenantId,
      type: 'human_request',
      title: '👤 Yetkili Talebi',
      message: `${p.customerName || 'Bilinmiyor'} - ${p.description || ''}`,
      status: 'unread',
    });
  }
}
