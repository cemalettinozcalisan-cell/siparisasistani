import { Controller, Get, Post, Put, Delete, Param, Body, Res } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { Response } from 'express';

@Controller('products')
export class ProductsController {
  constructor(private readonly supabase: SupabaseService) {}

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
    const { error } = await this.supabase.db
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  }

  @Get('catalog/:tenantId')
  async catalog(@Param('tenantId') tenantId: string, @Res() res: Response) {
    const products = await this.list(tenantId) as any[];
    const rows = products.map((p: any) =>
      `<tr><td>${p.product_name}</td><td>${p.category || '-'}</td><td>${Number(p.price).toLocaleString('tr-TR')} TL</td><td>${(p.sale_types || []).join(', ')}</td></tr>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ürün Kataloğu</title>
      <style>body{font-family:Arial,sans-serif;margin:30px;color:#333}h1{color:#4f46e5;border-bottom:2px solid #4f46e5;padding-bottom:8px;font-size:20px}
      table{width:100%;border-collapse:collapse;margin-top:15px}th{background:#4f46e5;color:#fff;padding:8px 10px;text-align:left;font-size:12px}
      td{padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:13px}.footer{margin-top:25px;font-size:10px;color:#9ca3af;text-align:center}
      </style></head><body><h1>📋 Ürün Kataloğu</h1><p style="color:#6b7280;font-size:12px">${new Date().toLocaleDateString('tr-TR')}</p>
      <table><thead><tr><th>Ürün</th><th>Kategori</th><th>Fiyat</th><th>Satış Tipleri</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="footer">SiparişAsistanı — Otomatik oluşturulmuştur</div></body></html>`;
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
