import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { TimelineService } from '../timeline/timeline.service';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import * as crypto from 'crypto';

@UseGuards(TenantGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly timeline: TimelineService,
  ) {}

  @Roles('owner', 'manager')
  @Get(':tenantId')
  async list(@Param('tenantId') tenantId: string) {
    const { data } = await this.supabase.db
      .from('users')
      .select('id, name, email, phone, role, active, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    return data || [];
  }

  @Roles('owner', 'manager')
  @Post(':tenantId')
  async create(
    @Param('tenantId') tenantId: string,
    @Body() body: { name: string; email: string; password: string; role: string; active?: boolean },
    @Req() req: any,
  ) {
    const currentUser = req.user;
    if (currentUser?.role === 'manager' && body.role === 'owner') {
      throw new BadRequestException('Yönetici kullanıcılar sahip rolünde kullanıcı oluşturamaz');
    }
    const hash = crypto.createHash('sha256').update(body.password).digest('hex');
    const { data, error } = await this.supabase.db
      .from('users')
      .insert({
        tenant_id: tenantId,
        name: body.name,
        email: body.email,
        password: hash,
        role: body.role || 'staff',
        active: body.active !== false,
      })
      .select('id, name, email, role, active, created_at')
      .single();
    if (error) throw new BadRequestException(error.message);

    await this.timeline.logEvent({
      tenantId,
      entityType: 'user',
      entityId: data.id,
      eventType: 'USER_CREATED',
      description: `${body.name} (${body.role || 'staff'}) kullanıcısı oluşturuldu`,
      actorType: 'STAFF',
    });

    return data;
  }

  @Roles('owner', 'manager')
  @Put(':tenantId/:id')
  async update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any,
  ) {
    const currentUser = req.user;
    const updateData: Record<string, unknown> = { ...body };

    // Manager can't set anyone to owner
    if (currentUser?.role === 'manager' && body.role === 'owner') {
      throw new BadRequestException('Yönetici kullanıcılar sahip rolü atayamaz');
    }

    // Get existing user to prevent manager from editing owner users
    const { data: existing } = await this.supabase.db
      .from('users')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();
    if (currentUser?.role === 'manager' && (existing as any)?.role === 'owner') {
      throw new BadRequestException('Yönetici kullanıcılar sahip kullanıcısını düzenleyemez');
    }

    if (updateData.password) {
      updateData.password = crypto.createHash('sha256').update(updateData.password as string).digest('hex');
    }
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.tenant_id;

    const { data, error } = await this.supabase.db
      .from('users')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('id, name, email, role, active, created_at')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  @Roles('owner', 'manager')
  @Put(':tenantId/:id/deactivate')
  async deactivate(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const currentUser = req.user;
    const { data: existing } = await this.supabase.db
      .from('users')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();
    if (currentUser?.role === 'manager' && (existing as any)?.role === 'owner') {
      throw new BadRequestException('Yönetici kullanıcılar sahip kullanıcısını pasif yapamaz');
    }
    const { error } = await this.supabase.db
      .from('users')
      .update({ active: false })
      .eq('tenant_id', tenantId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  @Roles('owner', 'manager')
  @Put(':tenantId/:id/activate')
  async activate(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    const { error } = await this.supabase.db
      .from('users')
      .update({ active: true })
      .eq('tenant_id', tenantId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  @Roles('owner', 'manager')
  @Delete(':tenantId/:id')
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const currentUser = req.user;
    const { data: existing } = await this.supabase.db
      .from('users')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();
    if (currentUser?.role === 'manager' && (existing as any)?.role === 'owner') {
      throw new BadRequestException('Yönetici kullanıcılar sahip kullanıcısını silemez');
    }
    const { error } = await this.supabase.db
      .from('users')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);

    await this.timeline.logEvent({
      tenantId,
      entityType: 'user',
      entityId: id,
      eventType: 'USER_DELETED',
      description: `Kullanıcı silindi`,
      actorType: 'STAFF',
    });

    return { success: true };
  }
}
