import { Controller, Get, Put, Param, Query, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Controller('notifications-api')
export class NotificationsApiController {
  private readonly logger = new Logger(NotificationsApiController.name);
  constructor(private readonly supabase: SupabaseService) {}

  @Get(':tenantId')
  async list(@Param('tenantId') tenantId: string, @Query('limit') limit?: string) {
    try {
      const { data } = await this.supabase.db
        .from('notifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit || '50'));
      return data || [];
    } catch (e) {
      this.logger.warn('Notifications list query failed');
      return [];
    }
  }

  @Get(':tenantId/unread-count')
  async unreadCount(@Param('tenantId') tenantId: string) {
    try {
      const { count } = await this.supabase.db
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'unread');
      return { count: count || 0 };
    } catch (e) {
      return { count: 0 };
    }
  }

  @Put(':tenantId/read/:id')
  async markRead(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    try {
      await this.supabase.db
        .from('notifications')
        .update({ status: 'read' })
        .eq('tenant_id', tenantId)
        .eq('id', id);
    } catch (e) { this.logger.error('Failed to mark notification as read', e); }
    return { success: true };
  }

  @Put(':tenantId/read-all')
  async markAllRead(@Param('tenantId') tenantId: string) {
    try {
      await this.supabase.db
        .from('notifications')
        .update({ status: 'read' })
        .eq('tenant_id', tenantId)
        .eq('status', 'unread');
    } catch (e) { this.logger.error('Failed to mark notification as read', e); }
    return { success: true };
  }
}
