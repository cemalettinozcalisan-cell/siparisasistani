import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Controller('settings')
export class SettingsController {
  constructor(private readonly supabase: SupabaseService) {}

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
    return data;
  }
}
