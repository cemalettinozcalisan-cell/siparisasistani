import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { TimelineService } from '../timeline/timeline.service';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(TenantGuard)
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly timeline: TimelineService,
  ) {}

  @Roles('owner', 'manager')
  @Get(':tenantId')
  async get(@Param('tenantId') tenantId: string) {
    const { data } = await this.supabase.db
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!data) {
      const { data: created } = await this.supabase.db
        .from('tenant_settings')
        .insert({ tenant_id: tenantId })
        .select()
        .single();
      return created;
    }
    return data;
  }

  @Put(':tenantId')
  async update(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    const { data, error } = await this.supabase.db
      .from('tenant_settings')
      .update(body)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Log settings update
    const changedKeys = Object.keys(body).filter(k => !['tenant_id', 'id'].includes(k));
    await this.timeline.logEvent({
      tenantId,
      entityType: 'settings',
      entityId: tenantId,
      eventType: 'SETTINGS_UPDATED',
      description: `Ayarlar güncellendi (${changedKeys.slice(0, 5).join(', ')}${changedKeys.length > 5 ? ' ve diğerleri' : ''})`,
      actorType: 'STAFF',
    });

    return data;
  }
}
