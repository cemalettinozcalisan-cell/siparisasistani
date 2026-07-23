import { Controller, Get, Put, Param, Query } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Controller('notifications-api')
export class NotificationsApiController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get(':tenantId')
  async list(@Param('tenantId') tenantId: string, @Query('limit') limit?: string) {
    const { data } = await this.supabase.db
      .from('notifications')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit || '50'));
    return data || [];
  }

  @Get(':tenantId/unread-count')
  async unreadCount(@Param('tenantId') tenantId: string) {
    const { count } = await this.supabase.db
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'unread');
    return { count: count || 0 };
  }

  @Put(':tenantId/read/:id')
  async markRead(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    await this.supabase.db
      .from('notifications')
      .update({ status: 'read' })
      .eq('tenant_id', tenantId)
      .eq('id', id);
    return { success: true };
  }

  @Put(':tenantId/read-all')
  async markAllRead(@Param('tenantId') tenantId: string) {
    await this.supabase.db
      .from('notifications')
      .update({ status: 'read' })
      .eq('tenant_id', tenantId)
      .eq('status', 'unread');
    return { success: true };
  }
}
