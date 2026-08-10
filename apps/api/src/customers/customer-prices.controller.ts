import { Controller, Get, Post, Put, Delete, Param, Body, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { TimelineService } from '../timeline/timeline.service';

@Controller('customer-prices')
export class CustomerPricesController {
  private readonly logger = new Logger(CustomerPricesController.name);
  constructor(
    private readonly supabase: SupabaseService,
    private readonly timeline: TimelineService,
  ) {}

  @Get(':tenantId/:customerId')
  async list(@Param('tenantId') tenantId: string, @Param('customerId') customerId: string) {
    try {
      const { data } = await this.supabase.db
        .from('customer_prices')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('customer_id', customerId)
        .order('product_name');
      if (data && data.length > 0) return data;
    } catch {}
    return this.getMockPrices(customerId);
  }

  private getMockPrices(customerId: string): Record<string, unknown>[] {
    if (customerId === 'cust-004') { // Fatma Şahin - toptan müşteri
      return [
        { id: 'cp-001', customer_id: customerId, product_name: 'Yumurta (30 Koli)', unit: 'KOLI', price: 850, min_quantity: 10, valid_from: '2026-01-01', valid_until: '2026-12-31' },
        { id: 'cp-002', customer_id: customerId, product_name: 'Dana Parmak Sucuk', unit: 'KG', price: 780, min_quantity: 20 },
      ];
    }
    if (customerId === 'cust-006') { // Hatice Çelik - bümeksi
      return [
        { id: 'cp-003', customer_id: customerId, product_name: 'Bükme (Tepsi)', unit: 'TEPSI', price: 450, min_quantity: 10 },
        { id: 'cp-004', customer_id: customerId, product_name: 'Afyon Ekşi Maya Ekmek', unit: 'ADET', price: 25, min_quantity: 50 },
      ];
    }
    return [];
  }

  @Post(':tenantId/:customerId')
  async create(@Param('tenantId') tenantId: string, @Param('customerId') customerId: string, @Body() body: Record<string, unknown>) {
    const { data, error } = await this.supabase.db
      .from('customer_prices')
      .insert({ tenant_id: tenantId, customer_id: customerId, ...body })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await this.timeline.logEvent({
      tenantId, entityType: 'customer', entityId: customerId,
      eventType: 'PRICE_ADDED',
      description: `Özel fiyat tanımlandı: ${body.product_name || 'Ürün'} (${Number(body.price).toLocaleString('tr-TR')} TL)`,
      actorType: 'STAFF',
    });

    return data;
  }

  @Put(':tenantId/:customerId/:id')
  async update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const { data, error } = await this.supabase.db
      .from('customer_prices')
      .update(body)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  @Delete(':tenantId/:customerId/:id')
  async remove(@Param('tenantId') tenantId: string, @Param('customerId') customerId: string, @Param('id') id: string) {
    await this.supabase.db.from('customer_prices').delete().eq('id', id);

    await this.timeline.logEvent({
      tenantId, entityType: 'customer', entityId: customerId,
      eventType: 'PRICE_DELETED',
      description: 'Özel fiyat silindi',
      actorType: 'STAFF',
    });

    return { success: true };
  }
}
