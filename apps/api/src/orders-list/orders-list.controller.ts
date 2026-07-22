import { Controller, Get, Param, Query } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Controller('orders-list')
export class OrdersListController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get(':tenantId')
  async list(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    let query = this.supabase.db
      .from('orders')
      .select('id, order_number, total_price, status, channel, created_at, customer:customer_id(name, phone)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status.toUpperCase());
    }

    if (q) {
      query = query.or(`order_number.ilike.%${q}%`);
    }

    const { data } = await query.limit(parseInt(limit || '100'));

    return (data || []).map((o: Record<string, unknown>) => ({
      id: o.id,
      order_number: o.order_number,
      total_price: o.total_price,
      status: o.status,
      channel: o.channel,
      created_at: o.created_at,
      customer_name: (o.customer as Record<string, unknown>)?.name || '',
      customer_phone: (o.customer as Record<string, unknown>)?.phone || '',
    }));
  }
}
