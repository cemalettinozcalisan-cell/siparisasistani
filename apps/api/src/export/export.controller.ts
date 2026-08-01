import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { SupabaseService } from '../common/supabase.client';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(TenantGuard)
@Controller('export')
export class ExportController {
  constructor(private readonly supabase: SupabaseService) {}

  @Roles('owner', 'manager')
  @Get('orders/:tenantId')
  async exportOrders(@Param('tenantId') tenantId: string, @Res() res: Response) {
    const { data } = await this.supabase.db
      .from('orders')
      .select('order_number, total_price, status, channel, created_at, customer:customer_id(name, phone, city)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1000);

    const rows = (data || []).map((o: Record<string, unknown>) => ({
      SiparisNo: o.order_number,
      Musteri: (o.customer as Record<string, unknown>)?.name || '',
      Telefon: (o.customer as Record<string, unknown>)?.phone || '',
      Sehir: (o.customer as Record<string, unknown>)?.city || '',
      Tutar: o.total_price,
      Durum: o.status,
      Kanal: o.channel,
      Tarih: new Date(o.created_at as string).toLocaleDateString('tr-TR'),
    }));

    const csv = [
      Object.keys(rows[0] || {}).join(','),
      ...rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(',')),
    ].join('\n');

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename=siparisler.csv',
    });
    res.send('\uFEFF' + csv);
  }

  @Roles('owner', 'manager')
  @Get('customers/:tenantId')
  async exportCustomers(@Param('tenantId') tenantId: string, @Res() res: Response) {
    const { data } = await this.supabase.db
      .from('customers')
      .select('name, phone, city, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1000);

    const rows = (data || []).map((c: Record<string, unknown>) => ({
      Ad: c.name,
      Telefon: c.phone,
      Sehir: c.city,
      KayitTarihi: new Date(c.created_at as string).toLocaleDateString('tr-TR'),
    }));

    const csv = [
      Object.keys(rows[0] || {}).join(','),
      ...rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(',')),
    ].join('\n');

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename=musteriler.csv',
    });
    res.send('\uFEFF' + csv);
  }
}
