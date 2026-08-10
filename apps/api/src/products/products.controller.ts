import { Controller, Get, Post, Put, Delete, Param, Body, Res } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { TimelineService } from '../timeline/timeline.service';
import { Response } from 'express';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly timeline: TimelineService,
  ) {}

  @Get(':tenantId')
  async list(@Param('tenantId') tenantId: string) {
    const { data } = await this.supabase.db
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('product_name');

    if (data && data.length > 0) return data;

    return [
      { id: 'prod-001', product_name: 'Dana Parmak Sucuk', category: 'Sucuk', price: 890, unit: 'KG', sale_types: ['KG', 'SAP'], variable_weight: true, avg_weight_gr: 250, active: true },
      { id: 'prod-002', product_name: 'Pastırma', category: 'Sucuk', price: 1200, unit: 'KG', sale_types: ['KG'], variable_weight: false, active: true },
      { id: 'prod-003', product_name: 'Kaymak', category: 'Süt Ürünleri', price: 450, unit: 'KG', sale_types: ['KG'], variable_weight: true, avg_weight_gr: 500, active: true },
      { id: 'prod-004', product_name: 'Haşhaş Ezmesi', category: 'Ezme', price: 300, unit: 'KG', sale_types: ['KG'], variable_weight: false, active: true },
      { id: 'prod-005', product_name: 'Kangal Sucuk', category: 'Sucuk', price: 750, unit: 'KG', sale_types: ['KG', 'SAP'], variable_weight: true, avg_weight_gr: 300, active: true },
      { id: 'prod-006', product_name: 'Acılı Parmak Sucuk', category: 'Sucuk', price: 920, unit: 'KG', sale_types: ['KG', 'SAP'], variable_weight: true, avg_weight_gr: 250, active: true },
      { id: 'prod-007', product_name: 'Tulum Peyniri', category: 'Peynir', price: 500, unit: 'KG', sale_types: ['KG'], variable_weight: true, avg_weight_gr: 800, active: true },
    ];
  }

  @Post(':tenantId')
  async create(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    const productData: Record<string, unknown> = { ...body, tenant_id: tenantId };
    if (body.sale_types && typeof body.sale_types === 'string') {
      productData.sale_types = JSON.parse(body.sale_types as string);
    }
    const { data, error } = await this.supabase.db
      .from('products')
      .insert(productData)
      .select()
      .single();
    if (error) throw new Error(error.message);

    const name = (data as any)?.product_name || body.product_name || 'Ürün';
    await this.timeline.logEvent({
      tenantId,
      entityType: 'product',
      entityId: (data as any)?.id,
      eventType: 'PRODUCT_CREATED',
      description: `${name} ürünü eklendi`,
      actorType: 'STAFF',
    });

    return data;
  }

  @Post(':tenantId/bulk')
  async bulkCreate(@Param('tenantId') tenantId: string, @Body() body: { products: Record<string, unknown>[] }) {
    const items = body.products.map((p) => ({ ...p, tenant_id: tenantId }));
    const { data, error } = await this.supabase.db.from('products').insert(items).select();
    if (error) throw new Error(error.message);
    return data;
  }

  @Put(':tenantId/:id')
  async update(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const { data, error } = await this.supabase.db
      .from('products')
      .update(body)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  @Delete(':tenantId/:id')
  async remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    // Get product name before soft-deleting
    const { data: product } = await this.supabase.db
      .from('products')
      .select('product_name')
      .eq('id', id)
      .single();

    const { error } = await this.supabase.db
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', id);
    if (error) throw new Error(error.message);

    await this.timeline.logEvent({
      tenantId,
      entityType: 'product',
      entityId: id,
      eventType: 'PRODUCT_DELETED',
      description: `${(product as any)?.product_name || 'Ürün'} silindi`,
      actorType: 'STAFF',
    });

    return { success: true };
  }

  @Get('catalog/:tenantId')
  async catalog(@Param('tenantId') tenantId: string, @Res() res: Response) {
    const products = await this.list(tenantId) as any[];
    const rows = products.map((p: any) => {
      const saleTypes = (p.sale_types || []).join(', ');
      const stock = p.track_stock ? `${p.stock_qty || 0} ${p.unit || 'KG'}` : 'Sınırsız';
      const activeStr = p.active === false ? 'Pasif' : 'Aktif';
      const ai = p.ai_rules || '-';
      const wholesale = p.wholesale_price > 0 ? `${Number(p.wholesale_price).toLocaleString('tr-TR')} TL` : '-';
      return `<tr><td>${p.product_name}</td><td>${p.category || '-'}</td><td>${Number(p.price).toLocaleString('tr-TR')} TL</td><td>${wholesale}</td><td>${p.unit || 'KG'}</td><td>${saleTypes}</td><td>${stock}</td><td>${ai}</td><td>${activeStr}</td></tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Urun Katalogu</title>
      <style>body{font-family:Arial,sans-serif;margin:30px;color:#333}h1{color:#4f46e5;border-bottom:2px solid #4f46e5;padding-bottom:8px;font-size:20px}
      table{width:100%;border-collapse:collapse;margin-top:15px}th{background:#4f46e5;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
      td{padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:11px}.footer{margin-top:25px;font-size:10px;color:#9ca3af;text-align:center}
      </style></head><body><h1>Urun Katalogu</h1><p style="color:#6b7280;font-size:12px">${new Date().toLocaleDateString('tr-TR')}</p>
      <table><thead><tr><th>Urun</th><th>Kategori</th><th>Fiyat</th><th>Toptan</th><th>Birim</th><th>Satis Tipleri</th><th>Stok</th><th>AI Kurali</th><th>Durum</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="footer">SiparisAsistani — Otomatik olusturulmustur</div></body></html>`;
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="urun-katalogu.html"');
    res.send(html);
  }
}
