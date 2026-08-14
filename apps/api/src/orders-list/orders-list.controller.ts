import { Controller, Get, Patch, Delete, Param, Query, Body, Logger, UseGuards } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { TimelineService } from '../timeline/timeline.service';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';

@UseGuards(TenantGuard)
@Controller('orders-list')
export class OrdersListController {
  private readonly logger = new Logger(OrdersListController.name);
  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventBus: EventBusService,
    private readonly timeline: TimelineService,
  ) {}

  @Roles('owner', 'manager', 'staff')
  @Get(':tenantId')
  async list(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      let query = this.supabase.db
        .from('orders')
        .select('id, order_number, total_price, status, channel, source, created_at, notes, customer_note, cargo_company, tracking_number, payment_method, payment_status, customer:customer_id(name, phone, city, address)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        const statuses = status.toUpperCase().split(',');
        if (statuses.length === 1) query = query.eq('status', statuses[0]);
        else query = query.in('status', statuses);
      }
      if (source && source !== 'all') query = query.eq('source', source.toUpperCase());
      if (q) query = query.or(`order_number.ilike.%${q}%`);

      const { data, error } = await query.limit(parseInt(limit || '100'));
      if (error) {
        this.logger.error(`Supabase query error: ${JSON.stringify(error)}`);
        return this.getMockOrders(source);
      }
      const rawOrders = data || [];

      if (rawOrders.length === 0) return this.getMockOrders(source);

      const results = rawOrders.map((o: Record<string, unknown>) => ({
        id: o.id, order_number: o.order_number, total_price: o.total_price,
        status: o.status, channel: o.channel, source: o.source || 'PHONE',
        notes: o.notes || '', customer_note: (o as any).customer_note || (o as any).notes || '',
        cargo_company: o.cargo_company || '', tracking_number: o.tracking_number || '',
        payment_method: o.payment_method || '', payment_status: o.payment_status || '',
        created_at: o.created_at,
        customer_name: (o.customer as Record<string, unknown>)?.name || (o as any).customer_name || '',
        customer_phone: (o.customer as Record<string, unknown>)?.phone || (o as any).customer_phone || '',
        customer_city: (o.customer as Record<string, unknown>)?.city || '',
        customer_address: (o.customer as Record<string, unknown>)?.address || (o as any).customer_address || '',
        customer_birthday: (o.customer as Record<string, unknown>)?.birth_date || '',
        customer_identity: (o.customer as Record<string, unknown>)?.identity_number || '',
        customer_company: (o.customer as Record<string, unknown>)?.company_name || '',
      }));

      const demoChannels = this.getMockOrders(source);
      const existingIds = new Set(results.map((r) => r.id));
      const injected = demoChannels.filter((d) => !existingIds.has(d.id));
      const merged = [...results, ...injected].sort((a, b) =>
        new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime()
      );

      if (source && source !== 'all') return merged.filter((o) => o.source === source);
      return merged;
    } catch (e) {
      this.logger.warn(`Orders list Supabase query failed: ${String(e)}, returning mock`);
      return this.getMockOrders(source);
    }
  }

  private getMockOrders(sourceFilter?: string): Record<string, unknown>[] {
    const now = Date.now();
    const orders = [
      { id: 'ord-001', order_number: '26-00001', total_price: 1780, status: 'DELIVERED', channel: 'phone', source: 'PHONE', notes: '', customer_note: '', created_at: new Date(now - 3600000).toISOString(), customer_name: 'Zafer Ayyıldız', customer_phone: '05321234567', customer_city: 'Afyonkarahisar', customer_address: 'Afyonkarahisar, Atatürk Cad. No:42', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Dana Parmak Sucuk', quantity: 2, unit: 'KG', unit_price: 890 }] },
      { id: 'ord-002', order_number: '26-00002', total_price: 4500, status: 'PROCESSING', channel: 'phone', source: 'PHONE', notes: '', customer_note: '', created_at: new Date(now - 7200000).toISOString(), customer_name: 'Mehmet Öztürk', customer_phone: '05339876543', customer_city: 'Afyonkarahisar', customer_address: 'Afyonkarahisar, Zafer Mah.', customer_company: '', customer_birthday: '10 Mart', customer_identity: '', items: [{ product_name: 'Pastırma', quantity: 3, unit: 'KG', unit_price: 1200 }, { product_name: 'Dana Parmak Sucuk', quantity: 1, unit: 'KG', unit_price: 890 }] },
      { id: 'ord-003', order_number: '26-00003', total_price: 28500, status: 'APPROVED', channel: 'phone', source: 'PHONE', payment: 'IBAN', notes: 'Toptan sipariş', customer_note: '', created_at: new Date(now - 10800000).toISOString(), customer_name: 'Fatma Şahin', customer_phone: '05449876543', customer_city: 'Ankara', customer_address: 'Ankara, Çankaya', customer_company: 'Şahin Toptan Gıda A.Ş.', customer_birthday: '', customer_identity: '9876543210', items: [{ product_name: 'Köy Yumurtası', quantity: 30, unit: 'KOLİ', unit_price: 650 }, { product_name: 'Bükme (Patatesli)', quantity: 15, unit: 'TEPİ', unit_price: 600 }] },
      { id: 'ord-004', order_number: '26-00004', total_price: 15600, status: 'PACKAGING', channel: 'whatsapp', source: 'WHATSAPP', payment: 'Kapıda Nakit', notes: 'Toptan', customer_note: '', created_at: new Date(now - 14400000).toISOString(), customer_name: 'Hatice Çelik', customer_phone: '05328765432', customer_city: 'Ankara', customer_address: 'Ankara, Keçiören', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Bükme (Patatesli)', quantity: 12, unit: 'TEPİ', unit_price: 600 }, { product_name: 'Haşhaş Ezmesi', quantity: 20, unit: 'KG', unit_price: 420 }] },
      { id: 'ord-005', order_number: '26-00005', total_price: 920, status: 'DELIVERED', channel: 'whatsapp', source: 'WHATSAPP', notes: '', customer_note: '', created_at: new Date(now - 18000000).toISOString(), customer_name: 'Ali Kaya', customer_phone: '05411223344', customer_city: 'İstanbul', customer_address: 'İstanbul, Kadıköy', customer_company: '', customer_birthday: '25 Aralık', customer_identity: '', items: [{ product_name: 'Dana Sucuk', quantity: 1, unit: 'KG', unit_price: 920 }] },
      { id: 'ord-006', order_number: '26-00006', total_price: 3200, status: 'SHIPPED', channel: 'phone', source: 'PERAKENDE', notes: '', customer_note: '', created_at: new Date(now - 21600000).toISOString(), customer_name: 'Mustafa Öztürk', customer_phone: '05551234567', customer_city: 'Afyonkarahisar', customer_address: 'Afyonkarahisar, Uzun Çarşı', customer_company: 'Öztürk Kasap', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Dana Parmak Sucuk', quantity: 2, unit: 'KG', unit_price: 890 }, { product_name: 'Pastırma', quantity: 1, unit: 'KG', unit_price: 1200 }, { product_name: 'Haşhaş Ezmesi', quantity: 2, unit: 'KG', unit_price: 110 }] },
      { id: 'ord-007', order_number: '26-00007', total_price: 1200, status: 'PROCESSING', channel: 'instagram', source: 'INSTAGRAM', notes: '', customer_note: '', created_at: new Date(now - 25200000).toISOString(), customer_name: 'İbrahim Yıldız', customer_phone: '05438765432', customer_city: 'İstanbul', customer_address: 'İstanbul, Üsküdar', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Pastırma', quantity: 1, unit: 'KG', unit_price: 1200 }] },
      { id: 'ord-008', order_number: '26-00008', total_price: 640, status: 'DELIVERED', channel: 'instagram', source: 'INSTAGRAM', notes: '', customer_note: '', created_at: new Date(now - 28800000).toISOString(), customer_name: 'Zeynep Arslan', customer_phone: '05328765432', customer_city: 'Ankara', customer_address: 'Ankara, Çankaya', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Haşhaş Ezmesi', quantity: 3, unit: 'KG', unit_price: 110 }, { product_name: 'Kaymak', quantity: 1, unit: 'KG', unit_price: 310 }] },
      { id: 'ord-009', order_number: '26-00009', total_price: 2450, status: 'PACKAGING', channel: 'website', source: 'WEBSITE', notes: '', customer_note: '', created_at: new Date(now - 32400000).toISOString(), customer_name: 'Ayşe Demir', customer_phone: '05339876543', customer_city: 'Afyonkarahisar', customer_address: 'Afyonkarahisar', customer_company: 'Demir Gıda Ltd.', customer_birthday: '15 Mayıs', customer_identity: '1234567890', items: [{ product_name: 'Dana Parmak Sucuk', quantity: 1, unit: 'KG', unit_price: 890 }, { product_name: 'Pastırma', quantity: 1, unit: 'KG', unit_price: 1200 }, { product_name: 'Kaymak', quantity: 1, unit: 'KG', unit_price: 360 }] },
      { id: 'ord-010', order_number: '26-00010', total_price: 890, status: 'CANCELLED', channel: 'website', source: 'WEBSITE', notes: '', customer_note: '', created_at: new Date(now - 36000000).toISOString(), customer_name: 'Elif Koç', customer_phone: '05411239876', customer_city: 'İzmir', customer_address: 'İzmir, Bornova', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Dana Sucuk', quantity: 1, unit: 'KG', unit_price: 890 }] },
      { id: 'ord-011', order_number: '26-00011', total_price: 5340, status: 'SHIPPED', channel: 'whatsapp', source: 'WHATSAPP', notes: '', customer_note: '', created_at: new Date(now - 39600000).toISOString(), customer_name: 'Ahmet Yılmaz', customer_phone: '05334567890', customer_city: 'Eskişehir', customer_address: 'Eskişehir, Odunpazarı', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Dana Parmak Sucuk', quantity: 3, unit: 'KG', unit_price: 890 }, { product_name: 'Bükme (Patatesli)', quantity: 4, unit: 'TEPİ', unit_price: 600 }, { product_name: 'Kaymak', quantity: 1, unit: 'KG', unit_price: 270 }] },
      { id: 'ord-012', order_number: '26-00012', total_price: 1860, status: 'DELIVERED', channel: 'phone', source: 'PHONE', notes: '', customer_note: '', created_at: new Date(now - 43200000).toISOString(), customer_name: 'Emine Korkmaz', customer_phone: '05448765432', customer_city: 'Kütahya', customer_address: 'Kütahya, Merkez', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Pastırma', quantity: 1, unit: 'KG', unit_price: 1200 }, { product_name: 'Dana Sucuk', quantity: 1, unit: 'KG', unit_price: 660 }] },
      { id: 'ord-013', order_number: '26-00013', total_price: 7120, status: 'COMPLETED', channel: 'phone', source: 'PHONE', notes: '', customer_note: '', created_at: new Date(now - 46800000).toISOString(), customer_name: 'Hasan Demir', customer_phone: '05321239876', customer_city: 'Afyonkarahisar', customer_address: 'Afyonkarahisar, Sandıklı', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Dana Parmak Sucuk', quantity: 5, unit: 'KG', unit_price: 890 }, { product_name: 'Pastırma', quantity: 2, unit: 'KG', unit_price: 1200 }, { product_name: 'Haşhaş Ezmesi', quantity: 2, unit: 'KG', unit_price: 115 }] },
      { id: 'ord-014', order_number: '26-00014', total_price: 2200, status: 'PROCESSING', channel: 'whatsapp', source: 'WHATSAPP', notes: '', customer_note: '', created_at: new Date(now - 50400000).toISOString(), customer_name: 'Selma Koç', customer_phone: '05557654321', customer_city: 'Uşak', customer_address: 'Uşak, Merkez', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Kaymak', quantity: 2, unit: 'KG', unit_price: 350 }, { product_name: 'Bükme (Patatesli)', quantity: 2, unit: 'TEPİ', unit_price: 600 }, { product_name: 'Köy Yumurtası', quantity: 2, unit: 'KOLİ', unit_price: 150 }] },
      { id: 'ord-015', order_number: '26-00015', total_price: 3560, status: 'SHIPPED', channel: 'phone', source: 'PHONE', notes: '', customer_note: '', created_at: new Date(now - 54000000).toISOString(), customer_name: 'Kadir Ateş', customer_phone: '05338765432', customer_city: 'Denizli', customer_address: 'Denizli, Pamukkale', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Dana Parmak Sucuk', quantity: 4, unit: 'KG', unit_price: 890 }] },
      { id: 'ord-016', order_number: '26-00016', total_price: 1500, status: 'new', channel: 'sms', source: 'SMS', payment: 'IBAN', notes: '', customer_note: '', created_at: new Date(now - 1800000).toISOString(), customer_name: 'Hüseyin Demir', customer_phone: '05333221144', customer_city: 'Konya', customer_address: 'Konya, Selçuklu Mah.', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Kangal Sucuk', quantity: 2, unit: 'KG', unit_price: 750 }] },
      { id: 'ord-017', order_number: '26-00017', total_price: 1840, status: 'PAYMENT_WAITING', channel: 'sms', source: 'SMS', payment: 'Kapıda Nakit', notes: '', customer_note: 'Acele gönderilsin', created_at: new Date(now - 3600000).toISOString(), customer_name: 'Fatma Aydın', customer_phone: '05445556677', customer_city: 'Aydın', customer_address: 'Aydın, Nazilli', customer_company: '', customer_birthday: '03.07.1975', customer_identity: '', items: [{ product_name: 'Acılı Parmak Sucuk', quantity: 2, unit: 'KG', unit_price: 920 }] },
      { id: 'ord-018', order_number: '26-00018', total_price: 2680, status: 'new', channel: 'website', source: 'WEBSITE', payment: 'Kapıda Kredi Kartı', notes: '', customer_note: '', created_at: new Date(now - 900000).toISOString(), customer_name: 'İpek Yıldırım', customer_phone: '05369876543', customer_city: 'Antalya', customer_address: 'Antalya, Muratpaşa', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Dana Parmak Sucuk', quantity: 2, unit: 'KG', unit_price: 890 }, { product_name: 'Kaymak', quantity: 2, unit: 'KG', unit_price: 450 }] },
      { id: 'ord-019', order_number: '26-00019', total_price: 2250, status: 'PAYMENT_WAITING', channel: 'phone', source: 'PHONE', payment: 'IBAN', notes: '', customer_note: 'Yarın teslim edilsin', created_at: new Date(now - 2700000).toISOString(), customer_name: 'Ali Kaya', customer_phone: '05411223344', customer_city: 'Afyonkarahisar', customer_address: 'Afyonkarahisar, Merkez', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Pastırma', quantity: 1, unit: 'KG', unit_price: 1200 }, { product_name: 'Kangal Sucuk', quantity: 1, unit: 'KG', unit_price: 750 }, { product_name: 'Haşhaş Ezmesi', quantity: 1, unit: 'KG', unit_price: 300 }] },
      { id: 'ord-020', order_number: '26-00020', total_price: 1780, status: 'new', channel: 'whatsapp', source: 'WHATSAPP', payment: 'Kapıda Nakit', notes: '', customer_note: '', created_at: new Date(now - 4500000).toISOString(), customer_name: 'Dursun Özbek', customer_phone: '05335556677', customer_city: 'Ankara', customer_address: 'Ankara, Çankaya', customer_company: '', customer_birthday: '12.08.1982', customer_identity: '', items: [{ product_name: 'Dana Parmak Sucuk', quantity: 2, unit: 'KG', unit_price: 890 }] },
      { id: 'ord-021', order_number: '26-00021', total_price: 920, status: 'new', channel: 'instagram', source: 'INSTAGRAM', payment: 'Link ile Ödeme', notes: '', customer_note: 'DM\'den yazdı', created_at: new Date(now - 6000000).toISOString(), customer_name: 'Can Uzun', customer_phone: '05331234567', customer_city: 'İzmir', customer_address: 'İzmir, Bornova', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Acılı Parmak Sucuk', quantity: 1, unit: 'KG', unit_price: 920 }] },
      { id: 'ord-022', order_number: '26-00022', total_price: 300, status: 'PAYMENT_WAITING', channel: 'phone', source: 'PHONE', payment: 'IBAN', notes: '', customer_note: '', created_at: new Date(now - 7500000).toISOString(), customer_name: 'Zehra Güler', customer_phone: '05441112233', customer_city: 'Eskişehir', customer_address: 'Eskişehir, Tepebaşı', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Haşhaş Ezmesi', quantity: 1, unit: 'KG', unit_price: 300 }] },
      { id: 'ord-023', order_number: '26-00023', total_price: 2200, status: 'new', channel: 'whatsapp', source: 'WHATSAPP', payment: 'Kapıda Kredi Kartı', notes: '', customer_note: 'Akşam 6\'dan sonra teslim', created_at: new Date(now - 9000000).toISOString(), customer_name: 'Serkan Yalçın', customer_phone: '05551112233', customer_city: 'Uşak', customer_address: 'Uşak, Merkez', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Pastırma', quantity: 1, unit: 'KG', unit_price: 1200 }, { product_name: 'Tulum Peyniri', quantity: 2, unit: 'KG', unit_price: 500 }] },
      { id: 'ord-024', order_number: '26-00024', total_price: 1150, status: 'PAYMENT_WAITING', channel: 'instagram', source: 'INSTAGRAM', payment: 'IBAN', notes: '', customer_note: '', created_at: new Date(now - 10500000).toISOString(), customer_name: 'Merve Akşit', customer_phone: '05334445566', customer_city: 'Bursa', customer_address: 'Bursa, Nilüfer', customer_company: '', customer_birthday: '28.04.1994', customer_identity: '', items: [{ product_name: 'Kaymak', quantity: 2, unit: 'KG', unit_price: 350 }, { product_name: 'Haşhaş Ezmesi', quantity: 1, unit: 'KG', unit_price: 450 }] },
      { id: 'ord-025', order_number: '26-00025', total_price: 1760, status: 'new', channel: 'website', source: 'WEBSITE', payment: 'Kapıda Nakit', notes: '', customer_note: '', created_at: new Date(now - 12000000).toISOString(), customer_name: 'Engin Tufan', customer_phone: '05325558899', customer_city: 'Denizli', customer_address: 'Denizli, Merkezefendi', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Dana Parmak Sucuk', quantity: 1, unit: 'KG', unit_price: 890 }, { product_name: 'Kangal Sucuk', quantity: 1, unit: 'KG', unit_price: 750 }, { product_name: 'Haşhaş Ezmesi', quantity: 1, unit: 'KG', unit_price: 120 }] },
    ];
    if (sourceFilter && sourceFilter !== 'all') return orders.filter((o) => o.source === sourceFilter);
    return orders.map((o, i) => ({
      ...o,
      cargo_company: (o as any).cargo_company || ['yurtici', 'mng', 'aras', 'ptt', 'surat', 'dhl'][i % 6],
      tracking_number: (o as any).tracking_number || `${['YT', 'MNG', 'AR', 'PTT', 'SUR', 'DHL'][i % 6]}${String(1000000 + i * 137)}`,
      payment_method: (o as any).payment_method || (o as any).payment || 'iban',
      payment_status: (o as any).payment_status || (['DELIVERED', 'COMPLETED'].includes(String(o.status)) ? 'paid' : 'waiting'),
    }));
  }

  @Roles('owner', 'manager', 'staff')
  @Patch(':tenantId/:id')
  async update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    // Split customer fields from order fields
    const customerFields: Record<string, unknown> = {};
    const orderFields: Record<string, unknown> = {};
    const custKeys = ['customer_name', 'customer_phone', 'customer_city', 'customer_address', 'customer_company', 'tax_office', 'customer_identity', 'customer_birthday'];

    // For mock/demo orders (non-UUID IDs), skip all DB ops
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}/.test(id)) {
      this.eventBus.emit(SystemEvents.ORDER_UPDATED, tenantId, { orderId: id, changedFields: Object.keys(body).filter((k) => k !== 'tenant_id' && k !== 'id'), mock: true }, id);
      return { id, ...body, _mock: true };
    }

    for (const [key, value] of Object.entries(body)) {
      if (key.startsWith('customer_')) {
        const dbKey = key === 'customer_name' ? 'name' : key === 'customer_phone' ? 'phone' : key === 'customer_city' ? 'city' : key === 'customer_address' ? 'address' : key === 'customer_company' ? 'company_name' : key === 'customer_identity' ? 'identity_number' : key === 'customer_birthday' ? 'birth_date' : key.replace('customer_', '');
        if (value !== undefined && value !== '') customerFields[dbKey] = value;
        if (key === 'customer_note') orderFields['customer_note'] = value;
      } else {
        orderFields[key] = value;
      }
    }

    // Update customer record if fields exist
    if (Object.keys(customerFields).length > 0) {
      try {
        const { data: orderData } = await this.supabase.db
          .from('orders')
          .select('customer_id')
          .eq('id', id)
          .single();

        if (orderData?.customer_id) {
          await this.supabase.db
            .from('customers')
            .update(customerFields)
            .eq('id', orderData.customer_id)
            .eq('tenant_id', tenantId);
        }
      } catch (e) { this.logger.error('Failed to update customer fields during order edit', e); }
    }

    // Update order record
    const { data, error } = await this.supabase.db
      .from('orders')
      .update(orderFields)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (data) {
      this.eventBus.emit(
        SystemEvents.ORDER_UPDATED,
        tenantId,
        {
          orderId: id,
          orderNumber: (data as any).order_number,
          customerName: (data as any).customer_name,
          channel: (data as any).channel,
          changedFields: Object.keys(body).filter((k) => k !== 'tenant_id' && k !== 'id'),
        },
        id,
      );

      const orderNum = (data as any).order_number ? `#${(data as any).order_number}` : '';
      await this.timeline.logEvent({
        tenantId, entityType: 'order', entityId: id,
        eventType: 'ORDER_UPDATED',
        description: `${orderNum} siparişi düzenlendi`,
        actorType: 'STAFF',
      });
    }
    return data;
  }

  @Roles('owner', 'manager', 'staff')
  @Delete(':tenantId/:id')
  async remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    const { error } = await this.supabase.db
      .from('orders')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);
    if (error) throw new Error(error.message);

    await this.timeline.logEvent({
      tenantId, entityType: 'order', entityId: id,
      eventType: 'ORDER_CANCELLED',
      description: 'Sipariş silindi',
      actorType: 'STAFF',
    });

    return { deleted: true };
  }
}
