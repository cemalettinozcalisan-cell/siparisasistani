import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(TenantGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly supabase: SupabaseService) {}

  @Roles('owner')
  @Get('stats')
  async getStats() {
    const [tenants, orders, customers, payments, users, conversations] = await Promise.all([
      this.supabase.db.from('tenants').select('id', { count: 'exact', head: true }),
      this.supabase.db.from('orders').select('total_price', { count: 'exact', head: true }),
      this.supabase.db.from('customers').select('id', { count: 'exact', head: true }),
      this.supabase.db.from('payments').select('amount').eq('status', 'paid'),
      this.supabase.db.from('users').select('id', { count: 'exact', head: true }),
      this.supabase.db.from('ai_audit_logs').select('id', { count: 'exact', head: true }),
    ]);

    const totalRevenue = (payments.data || []).reduce((s: number, p: Record<string, unknown>) => s + Number(p.amount || 0), 0);

    return {
      tenants: tenants.count || 0,
      orders: orders.count || 0,
      customers: customers.count || 0,
      revenue: totalRevenue,
      users: users.count || 0,
      aiConversations: conversations.count || 0,
      timestamp: new Date().toISOString(),
    };
  }

  @Roles('owner')
  @Get('tenants')
  async listTenants() {
    const { data } = await this.supabase.db
      .from('tenants')
      .select('id, company_name, domain, phone, email, city, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    return data || [];
  }
}
