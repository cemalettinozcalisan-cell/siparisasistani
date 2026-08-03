import { Controller, Get, Param } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Controller('health')
export class HealthController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  async systemHealth() {
    let supabaseStatus = 'ok';
    try {
      const { error } = await this.supabase.db.from('tenants').select('id').limit(1);
      if (error) supabaseStatus = 'error';
    } catch { supabaseStatus = 'error'; }

    return {
      status: supabaseStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: { supabase: supabaseStatus, deepseek: 'not_configured', openai: 'not_configured', elevenlabs: 'not_configured' },
      uptime: process.uptime(),
      memory: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
    };
  }

  @Get(':tenantId')
  async getHealth(@Param('tenantId') tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [orders, audits, customers, orderItems] = await Promise.all([
      this.supabase.db
        .from('orders')
        .select('id, order_number, status, total_price, channel, created_at, customer_name')
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
        .select('product_name, quantity'),
    ]);

    // --- service status from env ---
    const services = {
      aiBrain: { name: 'Sipariş Alan AI Beyin', status: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY ? 'ok' as const : 'down' as const, tip: 'AI' },
      voice: { name: 'Telefonla Konuşan Ses', status: process.env.ELEVENLABS_API_KEY ? 'ok' as const : 'not_configured' as const, tip: 'Ses' },
      sms: { name: 'Bilgilendirme SMSleri', status: process.env.NETGSM_USERNAME ? 'ok' as const : 'not_configured' as const, tip: 'SMS' },
      whatsapp: { name: 'WhatsApp Haberleşme Hattı', status: process.env.WHATSAPP_TOKEN ? 'ok' as const : 'not_configured' as const, tip: 'WhatsApp' },
      database: { name: 'Müşteri ve Ürün Veritabanı', status: 'ok' as const, tip: 'Veritabanı' },
    };

    // --- metrics ---
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

    // --- recent events (last 15 orders, formatted for esnaf) ---
    const recentOrders = (orders.data || [])
      .sort((a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 15);

    const channelEmoji: Record<string, string> = { phone: '📞', whatsapp: '💬', instagram: '📸', website: '🌐', manual: '📋', wholesale: '📦' };
    const recentEvents = recentOrders.map((o: { order_number: string; customer_name: string; channel: string; status: string; total_price: number; created_at: string }) => {
      const ch = channelEmoji[o.channel] || '📋';
      const name = o.customer_name || 'Yeni Müşteri';
      const time = new Date(o.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      if (o.status === 'cancelled') {
        return { time, text: `AI, ${name} ile görüşmeyi tamamlayamadı — esnafa devredildi`, type: 'warning' };
      }
      if (o.status === 'new') {
        return { time, text: `${ch} ${name} yeni sipariş verdi — onay bekliyor`, type: 'info' };
      }
      const channelNames: Record<string, string> = { phone: 'Telefon', whatsapp: 'WhatsApp', instagram: 'Instagram', website: 'Web Sitesi', wholesale: 'Toptan' };
      return { time, text: `${ch} ${name} — ${Number(o.total_price).toLocaleString('tr-TR')} TL tutarında sipariş ${channelNames[o.channel] || o.channel} üzerinden alındı`, type: 'success' };
    });

    return {
      services,
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
      totalCustomers: customers.data?.length || 0,
      totalOrders: orders.data?.length || 0,
      recentEvents,
    };
  }
}
