import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import * as crypto from 'crypto';

@Controller('users')
export class UsersController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get(':tenantId')
  async list(@Param('tenantId') tenantId: string) {
    const { data } = await this.supabase.db
      .from('users')
      .select('id, name, email, phone, role, active, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    return data || [];
  }

  @Post(':tenantId')
  async create(@Param('tenantId') tenantId: string, @Body() body: { name: string; email: string; password: string; role: string }) {
    const hash = crypto.createHash('sha256').update(body.password).digest('hex');
    const { data, error } = await this.supabase.db
      .from('users')
      .insert({ tenant_id: tenantId, name: body.name, email: body.email, password: hash, role: body.role || 'staff', active: true })
      .select('id, name, email, role, active, created_at')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  @Put(':tenantId/:id')
  async update(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const updateData = { ...body };
    if (updateData.password) {
      updateData.password = crypto.createHash('sha256').update(updateData.password as string).digest('hex');
    }
    const { data, error } = await this.supabase.db
      .from('users')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('id, name, email, role, active, created_at')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  @Put(':tenantId/:id/deactivate')
  async deactivate(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    const { error } = await this.supabase.db
      .from('users')
      .update({ active: false })
      .eq('tenant_id', tenantId)
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  }
}
