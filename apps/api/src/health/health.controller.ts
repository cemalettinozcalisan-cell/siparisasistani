import { Controller, Get, Param } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Controller('health')
export class HealthController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get(':tenantId')
  async getHealth(@Param('tenantId') tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [orders, audits, customers, orderItems] = await Promise.all([
      this.supabase.db
        .from('orders')
        .select('id, status, total_price, channel, created_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),

      this.supabase.db
        .from('ai_audit_logs')
        .select('confidence, latency_ms, success, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', today.toISOString()),

      this.supabase.db
        .from('customers')
        .select('id')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),

      this.supabase.db
        .from('order_items')
        .select('product_name, quantity')
        .in('order_id',
          this.supabase.db
            .from('orders')
            .select('id')
            .eq('tenant_id', tenantId)
            .gte('created_at', today.toISOString())
            .is('deleted_at', null)
            .not('status', 'eq', 'cancelled') as unknown as string[]
        ),
    ]);

    const todayOrders = (orders.data || []).filter(
      (o: { created_at: string }) => new Date(o.created_at) >= today,
    );

    const todayAudits = audits.data || [];
    const successfulAudits = todayAudits.filter((a: { success: boolean }) => a.success);
    const totalLatency = todayAudits.reduce((s: number, a: { latency_ms: number }) => s + (a.latency_ms || 0), 0);

    const productCounts: Record<string, number> = {};
    (orderItems.data || []).forEach((item: { product_name: string; quantity: number }) => {
      productCounts[item.product_name] = (productCounts[item.product_name] || 0) + Number(item.quantity);
    });
    const topProducts = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const humanTransfers = todayOrders.filter(
      (o: { status: string }) => o.status === 'cancelled',
    );

    const channelBreakdown: Record<string, number> = {};
    todayOrders.forEach((o: { channel: string }) => {
      channelBreakdown[o.channel] = (channelBreakdown[o.channel] || 0) + 1;
    });

    return {
      today: {
        totalCalls: todayOrders.length,
        aiSuccessRate: todayAudits.length > 0
          ? Math.round((successfulAudits.length / todayAudits.length) * 100)
          : 0,
        humanTransferCount: humanTransfers.length,
        avgCallDuration: todayAudits.length > 0
          ? Math.round(totalLatency / todayAudits.length / 1000 * 60)
          : 0,
        avgConfidence: todayAudits.length > 0
          ? Math.round(todayAudits.reduce((s: number, a: { confidence: number }) => s + (a.confidence || 0), 0) / todayAudits.length)
          : 0,
      },
      topProducts,
      channelBreakdown,
      totalCustomers: customers.data?.length || 0,
      totalOrders: orders.data?.length || 0,
    };
  }
}
