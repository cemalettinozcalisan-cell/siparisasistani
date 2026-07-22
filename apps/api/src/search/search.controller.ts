import { Controller, Get, Param, Query } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Controller('search')
export class SearchController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get(':tenantId')
  async search(@Param('tenantId') tenantId: string, @Query('q') q: string) {
    if (!q || q.length < 2) return { orders: [], customers: [], products: [] };

    const [orders, customers, products] = await Promise.all([
      this.supabase.db
        .from('orders')
        .select('id, order_number, total_price, status, created_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .or(`order_number.ilike.%${q}%`)
        .limit(10),

      this.supabase.db
        .from('customers')
        .select('id, name, phone, city')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(10),

      this.supabase.db
        .from('products')
        .select('id, product_name, price, unit')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .is('deleted_at', null)
        .or(`product_name.ilike.%${q}%`)
        .limit(10),
    ]);

    return {
      orders: orders.data || [],
      customers: customers.data || [],
      products: products.data || [],
    };
  }
}
