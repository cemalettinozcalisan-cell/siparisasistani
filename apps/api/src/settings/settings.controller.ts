import { Controller, Get, Put, Post, Param, Body, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
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
    const { data: settings } = await this.supabase.db
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const { data: tenant } = await this.supabase.db
      .from('tenants')
      .select('company_name, address, city, phone, email, created_at')
      .eq('id', tenantId)
      .maybeSingle();

    const { data: owner } = await this.supabase.db
      .from('users')
      .select('name')
      .eq('tenant_id', tenantId)
      .eq('role', 'owner')
      .maybeSingle();

    const merged = {
      ...settings,
      company_name: tenant?.company_name || '',
      address: tenant?.address || '',
      city: tenant?.city || '',
      phone: tenant?.phone || '',
      email: tenant?.email || '',
      created_at: tenant?.created_at || null,
      owner_name: owner?.name || '',
    };

    if (!merged) {
      const { data: created } = await this.supabase.db
        .from('tenant_settings')
        .insert({ tenant_id: tenantId })
        .select()
        .single();
      return created;
    }
    return merged;
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

  @Roles('owner', 'manager')
  @Post(':tenantId/logo')
  @UseInterceptors(FileInterceptor('logo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadLogo(@Param('tenantId') tenantId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Dosya yuklenmedi');

    const bucket = process.env.SUPABASE_LOGO_BUCKET || 'tenant-logos';
    const path = `${tenantId}/logo.${file.originalname.split('.').pop() || 'png'}`;

    const { error } = await this.supabase.client.storage.from(bucket).upload(path, file.buffer, { upsert: true, contentType: file.mimetype });
    if (error) throw new Error(`Logo yukleme hatasi: ${error.message}`);

    const { data: urlData } = this.supabase.client.storage.from(bucket).getPublicUrl(path);
    const logoUrl = urlData.publicUrl;

    await this.supabase.db.from('tenant_settings').update({ logo_url: logoUrl }).eq('tenant_id', tenantId);

    return { logoUrl };
  }

  @Roles('owner', 'manager')
  @Get(':tenantId/logo')
  async getLogo(@Param('tenantId') tenantId: string) {
    const { data } = await this.supabase.db.from('tenant_settings').select('logo_url').eq('tenant_id', tenantId).maybeSingle();
    return { logoUrl: data?.logo_url || null };
  }
}
