import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.client';

@Injectable()
export class AiMemoryService {
  private readonly logger = new Logger(AiMemoryService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async buildContext(tenantId: string, customerPhone?: string): Promise<string> {
    if (!customerPhone) {
      return '[MÜŞTERİ GEÇMİŞİ] Henüz müşteri tanımlanmadı.';
    }

    const customer = await this.findCustomer(tenantId, customerPhone);
    if (!customer) {
      return '[MÜŞTERİ GEÇMİŞİ] Bu telefon numarasıyla daha önce sipariş verilmemiş. Yeni müşteri.';
    }

    const sections: string[] = ['[MÜŞTERİ HAFIZASI]'];
    sections.push(`Müşteri: ${customer.name}`);
    sections.push(`Toplam sipariş: ${customer.orderCount}`);

    if (customer.lastOrder) {
      sections.push(`Son sipariş: #${customer.lastOrder.order_number} - ${customer.lastOrder.total_price} TL`);
      sections.push(`Son sipariş tarihi: ${customer.lastOrder.created_at}`);
      sections.push('Son sipariş ürünleri:');
      customer.lastOrder.items.forEach((item: { product_name: string; quantity: number; unit: string }) => {
        sections.push(`- ${item.quantity} ${item.unit} ${item.product_name}`);
      });
    }

    if (customer.preferences && customer.preferences.length > 0) {
      sections.push('', 'Müşteri tercihleri:');
      customer.preferences.forEach((pref: string) => sections.push(`- ${pref}`));
    }

    if (customer.lastCallNote) {
      sections.push('', `Son aramada not: ${customer.lastCallNote}`);
    }

    sections.push('', 'Müşteri tanındığında "Hoş geldiniz, [isim]!" diyerek karşıla.');
    return sections.join('\n');
  }

  private async findCustomer(
    tenantId: string,
    phone: string,
  ): Promise<{
    name: string;
    orderCount: number;
    lastOrder?: {
      order_number: string;
      total_price: string;
      created_at: string;
      items: { product_name: string; quantity: number; unit: string }[];
    };
    preferences?: string[];
    lastCallNote?: string;
  } | null> {
    const { data: customer } = await this.supabase.db
      .from('customers')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .maybeSingle();

    if (!customer) return null;

    const { count } = await this.supabase.db
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('customer_id', customer.id);

    const { data: lastOrder } = await this.supabase.db
      .from('orders')
      .select('id, order_number, total_price, created_at')
      .eq('tenant_id', tenantId)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let items: { product_name: string; quantity: number; unit: string }[] = [];
    if (lastOrder) {
      const { data: orderItems } = await this.supabase.db
        .from('order_items')
        .select('product_name, quantity, unit')
        .eq('order_id', lastOrder.id);

      items = orderItems || [];
    }

    return {
      name: customer.name,
      orderCount: count || 0,
      lastOrder: lastOrder
        ? {
            order_number: lastOrder.order_number,
            total_price: Number(lastOrder.total_price).toLocaleString('tr-TR'),
            created_at: new Date(lastOrder.created_at).toLocaleDateString('tr-TR'),
            items,
          }
        : undefined,
    };
  }

  async recordPreference(
    tenantId: string,
    customerId: string,
    preference: string,
  ): Promise<void> {
    await this.supabase.db.from('ai_events').insert({
      tenant_id: tenantId,
      event_type: 'order_received',
      event_data: {
        type: 'customer_preference',
        customer_id: customerId,
        preference,
      },
    });
  }
}
