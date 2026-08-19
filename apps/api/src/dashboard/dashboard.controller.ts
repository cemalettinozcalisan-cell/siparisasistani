import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

// AI kanalları (PANEL/manuel hariç — AI ajanının kapatabildiği kanallar)
const AI_SOURCES = ['PHONE', 'WHATSAPP', 'INSTAGRAM', 'WEBSITE', 'SMS'];
// Teslim edilmiş / kapanmış durumlar (pending filtrelerinden çıkarılır)
const DELIVERED_STATUSES = ['DELIVERED', 'COMPLETED', 'completed', 'CANCELLED', 'cancelled'];

@UseGuards(TenantGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly supabase: SupabaseService) {}

  @Roles('owner', 'manager')
  @Get(':tenantId')
  async getStats(@Param('tenantId') tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const [orders, customers, payments, conversations, timeline] = await Promise.all([
      this.supabase.db
        .from('orders')
        .select('*, customer:customer_id(name, phone, city, address, identity_number), items:order_items(product_name, quantity, unit, unit_price)')
        .eq('tenant_id', tenantId),
      this.supabase.db.from('customers').select('id, created_at').eq('tenant_id', tenantId),
      this.supabase.db.from('payments').select('amount, status, created_at').eq('tenant_id', tenantId).eq('status', 'paid'),
      this.supabase.db
        .from('conversation_sessions')
        .select('phone, status, call_status, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', todayIso),
      this.supabase.db
        .from('activity_logs')
        .select('id, event_type, description, channel, created_at, metadata')
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    const allOrders = (orders.data || []) as Record<string, any>[];
    const hasRealOrders = allOrders.length > 0;

    // Gerçek sipariş verisi varsa hepsini hesapla; yoksa mock fallback
    let data = this.computeStats(allOrders, customers.data || [], payments.data || [], conversations.data || [], timeline.data || [], todayIso);
    if (!hasRealOrders) data = this.getMockStats();

    return data;
  }

  private computeStats(
    orders: Record<string, any>[],
    customers: any[],
    payments: any[],
    conversations: any[],
    timeline: any[],
    todayIso: string,
  ) {
    const todayOrders = orders.filter((o) => new Date(o.created_at) >= new Date(todayIso));

    const normalizeStatus = (s: unknown) => String(s || '').toUpperCase();

    // Kargo Takibi = kargoya verilmiş (SHIPPED) ama henüz teslim edilmemiş siparişler.
    // Teslim edilince status DELIVERED olur ve buradan otomatik kaybolur.
    const cargoTrackingList = orders
      .filter((o) => {
        const st = normalizeStatus(o.status);
        return st === 'SHIPPED' && !DELIVERED_STATUSES.includes(st);
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((o) => this.mapOrder(o));

    // Bugünkü siparişler — modal için detaylı
    const todayOrdersList = todayOrders
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((o) => this.mapOrder(o));

    const cargoTracking = cargoTrackingList.length;

    // AI Satış: AI kanallarından bugün kapatılan siparişlerin cirosu
    const aiRevenue = todayOrders
      .filter((o) => AI_SOURCES.includes(String(o.source || 'PHONE').toUpperCase()))
      .reduce((sum, o) => sum + Number(o.total_price || 0), 0);

    // AI Müşteri: bugün AI ile etkileşime geçen tekil müşteri (session telefonları)
    const aiCustomers = new Set(conversations.map((c: any) => String(c.phone || '').trim()).filter(Boolean)).size;

    // AI Başarı: bugünkü görüşmelerde insana devredilmeden tamamlanan oran
    const totalCalls = conversations.length;
    const handled = conversations.filter((c: any) => {
      const st = String(c.call_status || c.status || '').toUpperCase();
      return st !== 'HUMAN_TRANSFER' && st !== 'FAILED' && st !== 'TIMEOUT';
    }).length;
    const aiSuccessRate = totalCalls > 0 ? Math.round((handled / totalCalls) * 100) : 98;

    // Talep & İstek: son 24 saatteki COMPLAINT / HUMAN_REQUIRED kayıtları
    const complaints24h = (timeline || []).filter((e) =>
      String(e.event_type || '').startsWith('COMPLAINT') || String(e.event_type || '') === 'HUMAN_REQUIRED'
    ).map((e) => ({
      id: e.id,
      event_type: e.event_type,
      description: e.description,
      channel: e.channel,
      severity: ((e.metadata as Record<string, unknown>)?.severity as string) || 'NORMAL',
      ticket_number: ((e.metadata as Record<string, unknown>)?.ticket_number as string) || '',
      created_at: e.created_at,
    }));

    return {
      todayOrders: todayOrders.length,
      cargoTracking,
      totalCustomers: customers.length,
      todayRevenue: todayOrders.reduce((sum, o) => sum + Number(o.total_price), 0),
      totalRevenue: (payments || []).reduce((sum, p) => sum + Number(p.amount), 0),
      aiCustomers,
      aiRevenue,
      aiSuccessRate,
      complaints24h,
      todayOrdersList,
      cargoTrackingList,
      orderStats: {
        preparing: orders.filter((o) => normalizeStatus(o.status) === 'PACKAGING' || normalizeStatus(o.status) === 'PACKAGED' || normalizeStatus(o.status) === 'PREPARING').length,
        shipped: orders.filter((o) => normalizeStatus(o.status) === 'SHIPPED').length,
        completed: orders.filter((o) => normalizeStatus(o.status) === 'DELIVERED' || normalizeStatus(o.status) === 'COMPLETED').length,
      },
    };
  }

  private mapOrder(o: Record<string, any>) {
    const cust = (o.customer as Record<string, unknown>) || {};
    return {
      id: o.id,
      order_number: o.order_number,
      total_price: o.total_price,
      status: o.status,
      channel: o.channel,
      source: o.source || 'PHONE',
      payment_method: o.payment_method,
      payment_status: o.payment_status,
      cargo_company: o.cargo_company || '',
      tracking_number: o.tracking_number || '',
      cargo_status: o.cargo_status || '',
      created_at: o.created_at,
      customer_name: cust.name || '',
      customer_phone: cust.phone || '',
      customer_city: cust.city || '',
      customer_address: cust.address || '',
      customer_identity: cust.identity_number || '',
      items: (o.items || []).map((it: any) => ({
        product_name: it.product_name,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unit_price,
        total: Number(it.quantity || 0) * Number(it.unit_price || 0),
      })),
    };
  }

  private getMockStats() {
    const now = Date.now();
    const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
    const mockOrders = [
      { id: 'ord-001', order_number: '26-00001', total_price: 1780, status: 'new', channel: 'phone', source: 'PHONE', payment_method: 'iban', payment_status: 'waiting', cargo_company: 'yurtici', tracking_number: 'YT1234567890', created_at: iso(3600000), customer_name: 'Zafer Ayyıldız', customer_phone: '05321234567', customer_city: 'Afyonkarahisar', customer_address: 'Atatürk Cad. No:42', customer_identity: '', items: [{ product_name: 'Dana Parmak Sucuk', quantity: 2, unit: 'KG', unit_price: 890, total: 1780 }] },
      { id: 'ord-002', order_number: '26-00002', total_price: 4500, status: 'PAYMENT_WAITING', channel: 'phone', source: 'PHONE', payment_method: 'iban', payment_status: 'waiting', cargo_company: 'mng', tracking_number: 'MNG98765432', created_at: iso(7200000), customer_name: 'Mehmet Öztürk', customer_phone: '05339876543', customer_city: 'Afyonkarahisar', customer_address: 'Zafer Mah.', customer_identity: '', items: [{ product_name: 'Pastırma', quantity: 3, unit: 'KG', unit_price: 1200, total: 3600 }, { product_name: 'Dana Parmak Sucuk', quantity: 1, unit: 'KG', unit_price: 890, total: 890 }] },
      { id: 'ord-003', order_number: '26-00003', total_price: 28500, status: 'PACKAGING', channel: 'whatsapp', source: 'WHATSAPP', payment_method: 'iban', payment_status: 'waiting', cargo_company: 'aras', tracking_number: 'AR1234567', created_at: iso(10800000), customer_name: 'Fatma Şahin', customer_phone: '05449876543', customer_city: 'Ankara', customer_address: 'Çankaya', customer_identity: '9876543210', items: [{ product_name: 'Köy Yumurtası', quantity: 30, unit: 'KOLİ', unit_price: 650, total: 19500 }, { product_name: 'Bükme (Patatesli)', quantity: 15, unit: 'TEPİ', unit_price: 600, total: 9000 }] },
      { id: 'ord-004', order_number: '26-00004', total_price: 15600, status: 'SHIPPED', channel: 'whatsapp', source: 'WHATSAPP', payment_method: 'iban', payment_status: 'paid', cargo_company: 'ptt', tracking_number: 'PTT12345', created_at: iso(14400000), customer_name: 'Hatice Çelik', customer_phone: '05328765432', customer_city: 'Ankara', customer_address: 'Keçiören', customer_identity: '', items: [{ product_name: 'Bükme (Patatesli)', quantity: 12, unit: 'TEPİ', unit_price: 600, total: 7200 }, { product_name: 'Haşhaş Ezmesi', quantity: 20, unit: 'KG', unit_price: 420, total: 8400 }] },
      { id: 'ord-005', order_number: '26-00005', total_price: 920, status: 'DELIVERED', channel: 'whatsapp', source: 'WHATSAPP', payment_method: 'website', payment_status: 'paid', cargo_company: 'yurtici', tracking_number: 'YT0987654321', created_at: iso(18000000), customer_name: 'Ali Kaya', customer_phone: '05411223344', customer_city: 'İstanbul', customer_address: 'Kadıköy', customer_identity: '', items: [{ product_name: 'Dana Sucuk', quantity: 1, unit: 'KG', unit_price: 920, total: 920 }] },
      { id: 'ord-006', order_number: '26-00006', total_price: 3200, status: 'shipped', channel: 'phone', source: 'PHONE', payment_method: 'iban', payment_status: 'waiting', cargo_company: 'surat', tracking_number: 'SUR1234', created_at: iso(21600000), customer_name: 'Mustafa Öztürk', customer_phone: '05551234567', customer_city: 'Afyonkarahisar', customer_address: 'Uzun Çarşı', customer_identity: '', items: [{ product_name: 'Dana Parmak Sucuk', quantity: 2, unit: 'KG', unit_price: 890, total: 1780 }, { product_name: 'Pastırma', quantity: 1, unit: 'KG', unit_price: 1200, total: 1200 }, { product_name: 'Haşhaş Ezmesi', quantity: 2, unit: 'KG', unit_price: 110, total: 220 }] },
    ];
    const todayOrdersList = mockOrders
      .filter((o) => ['ord-001', 'ord-002', 'ord-003'].includes(o.id))
      .map((o) => ({ ...o, created_at: iso(0), cargo_status: (o as any).cargo_status || '' }));
    const cargoTrackingList = mockOrders
      .filter((o) => ['SHIPPED', 'shipped'].includes(String(o.status)))
      .map((o) => ({ ...o, created_at: iso(0), cargo_status: (o as any).cargo_status || 'in_transit' }));

    return {
      todayOrders: todayOrdersList.length,
      cargoTracking: cargoTrackingList.length,
      totalCustomers: 126,
      todayRevenue: todayOrdersList.reduce((s, o) => s + Number(o.total_price), 0),
      totalRevenue: 24800,
      aiCustomers: 6,
      aiRevenue: 24800,
      aiSuccessRate: 98,
      complaints24h: [
        { id: 'c1', event_type: 'COMPLAINT_OPEN', description: 'AI, Test Müşteri için yüksek seviyede talep kaydı oluşturdu: Geç teslimat', channel: 'VOICE', severity: 'HIGH', ticket_number: 'TKT-0001', created_at: iso(3600000) },
        { id: 'c2', event_type: 'COMPLAINT_OPEN', description: 'Müşteri: Ürünlerin son kullanma tarihi geçmiş', channel: 'WHATSAPP', severity: 'CRITICAL', ticket_number: 'TKT-0002', created_at: iso(7200000) },
        { id: 'c3', event_type: 'HUMAN_REQUIRED', description: 'Müşteri iade talebinde bulundu, insan müdahalesi gerekiyor', channel: 'WHATSAPP', severity: 'NORMAL', ticket_number: 'TKT-0003', created_at: iso(14400000) },
      ],
      todayOrdersList,
      cargoTrackingList,
      orderStats: {
        preparing: 3,
        shipped: 2,
        completed: 1,
      },
    };
  }
}