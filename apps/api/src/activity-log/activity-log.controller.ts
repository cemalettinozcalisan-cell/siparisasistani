import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(TenantGuard)
@Controller('activity-log')
export class ActivityLogController {
  constructor(private readonly supabase: SupabaseService) {}

  @Roles('owner', 'manager')
  @Get(':tenantId')
  async list(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('event_type') eventType?: string,
  ) {
    const { data, error } = await this.supabase.db
      .from('activity_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit || '100'));

    if (error) return [];
    let results = data || [];

    if (from) results = results.filter((r) => (r.created_at as string) >= from);
    if (to) results = results.filter((r) => (r.created_at as string) <= to + 'T23:59:59');
    if (eventType) results = results.filter((r) => r.event_type === eventType);

    return results;
  }
}
