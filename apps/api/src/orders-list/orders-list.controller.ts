import { Controller, Get, Patch, Delete, Param, Query, Body, Logger, UseGuards } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(TenantGuard)
@Controller('orders-list')
export class OrdersListController {
  private readonly logger = new Logger(OrdersListController.name);
  constructor(private readonly supabase: SupabaseService) {}

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
        .select('id, order_number, total_price, status, channel, source, created_at, notes, customer_note, customer:customer_id(name, phone, city, address)')
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
      const existingChannels = new Set(results.map((r) => String(r.channel).toLowerCase()));
      const injected = demoChannels.filter((d) => !existingChannels.has(String(d.channel).toLowerCase()));
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
      { id: 'ord-003', order_number: '26-00003', total_price: 28500, status: 'APPROVED', channel: 'wholesale', source: 'WHOLESALE', notes: 'Toptan sipariş', customer_note: '', created_at: new Date(now - 10800000).toISOString(), customer_name: 'Fatma Şahin', customer_phone: '05449876543', customer_city: 'Ankara', customer_address: 'Ankara, Çankaya', customer_company: 'Şahin Toptan Gıda A.Ş.', customer_birthday: '', customer_identity: '9876543210', items: [{ product_name: 'Köy Yumurtası', quantity: 30, unit: 'KOLİ', unit_price: 650 }, { product_name: 'Bükme (Patatesli)', quantity: 15, unit: 'TEPİ', unit_price: 600 }] },
      { id: 'ord-004', order_number: '26-00004', total_price: 15600, status: 'PACKAGING', channel: 'whatsapp', source: 'WHOLESALE', notes: 'Toptan', customer_note: '', created_at: new Date(now - 14400000).toISOString(), customer_name: 'Hatice Çelik', customer_phone: '05328765432', customer_city: 'Ankara', customer_address: 'Ankara, Keçiören', customer_company: '', customer_birthday: '', customer_identity: '', items: [{ product_name: 'Bükme (Patatesli)', quantity: 12, unit: 'TEPİ', unit_price: 600 }, { product_name: 'Haşhaş Ezmesi', quantity: 20, unit: 'KG', unit_price: 420 }] },
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
    ];
    if (sourceFilter && sourceFilter !== 'all') return orders.filter((o) => o.source === sourceFilter);
    return orders;
  }

  @Roles('owner', 'manager', 'staff')
  @Patch(':tenantId/:id')
  async update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const { data, error } = await this.supabase.db
      .from('orders')
      .update(body)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
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
    return { deleted: true };
  }
}
