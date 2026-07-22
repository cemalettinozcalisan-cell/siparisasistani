import { Controller, Get, Param } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get(':tenantId')
  async getStats(@Param('tenantId') tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [orders, customers, payments, pending] = await Promise.all([
      this.supabase.db.from('orders').select('id, status, total_price, created_at').eq('tenant_id', tenantId),
      this.supabase.db.from('customers').select('id, created_at').eq('tenant_id', tenantId),
      this.supabase.db.from('payments').select('amount, status, created_at').eq('tenant_id', tenantId).eq('status', 'paid'),
      this.supabase.db.from('orders').select('id').eq('tenant_id', tenantId).eq('status', 'new'),
    ]);

    const todayOrders = (orders.data || []).filter(
      (o: { created_at: string }) => new Date(o.created_at) >= today,
    );

    return {
      todayOrders: todayOrders.length,
      pendingOrders: pending.data?.length || 0,
      totalCustomers: customers.data?.length || 0,
      todayRevenue: todayOrders.reduce(
        (sum: number, o: { total_price: number }) => sum + Number(o.total_price), 0,
      ),
      totalRevenue: (payments.data || []).reduce(
        (sum: number, p: { amount: number }) => sum + Number(p.amount), 0,
      ),
      orderStats: {
        preparing: (orders.data || []).filter((o: { status: string }) => o.status === 'preparing').length,
        shipped: (orders.data || []).filter((o: { status: string }) => o.status === 'shipped').length,
        completed: (orders.data || []).filter((o: { status: string }) => o.status === 'completed').length,
      },
    };
  }
}
