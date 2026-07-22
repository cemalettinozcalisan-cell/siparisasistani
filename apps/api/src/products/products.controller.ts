import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

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
    return data || [];
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
}
