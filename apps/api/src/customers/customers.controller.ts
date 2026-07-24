import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Controller('customers')
export class CustomersController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get(':tenantId')
  async list(@Param('tenantId') tenantId: string, @Query('q') q?: string) {
    let query = this.supabase.db
      .from('customers')
      .select('id, name, phone, city, created_at')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (q) {
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data: customers } = await query;

    // Get order counts for all customers
    const customerIds = (customers || []).map((c: Record<string, unknown>) => c.id);
    let orderCounts: Record<string, number> = {};

    if (customerIds.length > 0) {
      const { data: orders } = await this.supabase.db
        .from('orders')
        .select('customer_id, id')
        .eq('tenant_id', tenantId)
        .in('customer_id', customerIds);

      orderCounts = {};
      (orders || []).forEach((o: Record<string, unknown>) => {
        const cid = o.customer_id as string;
        orderCounts[cid] = (orderCounts[cid] || 0) + 1;
      });
    }

    return (customers || []).map((c: Record<string, unknown>) => ({
      ...c,
      order_count: orderCounts[c.id as string] || 0,
      total_spent: 0,
    }));
  }

  @Get(':tenantId/:id')
  async get(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    const { data: customer } = await this.supabase.db
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    const { data: orders } = await this.supabase.db
      .from('orders')
      .select('id, order_number, total_price, status, created_at')
      .eq('tenant_id', tenantId)
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    return { ...customer, orders };
  }

  @Post(':tenantId')
  async create(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    const { data, error } = await this.supabase.db
      .from('customers')
      .insert({ ...body, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  @Put(':tenantId/:id')
  async update(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const { data, error } = await this.supabase.db
      .from('customers')
      .update(body)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  @Post('dedup/:tenantId')
  async dedup(@Param('tenantId') tenantId: string) {
    try {
      const { data: all } = await this.supabase.db
        .from('customers')
        .select('id, phone, name, city, created_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      const groups = new Map<string, Record<string, unknown>[]>();
      for (const c of all || []) {
        const phone = (c as any).phone as string;
        if (!phone) continue;
        if (!groups.has(phone)) groups.set(phone, []);
        groups.get(phone)!.push(c);
      }

      let merged = 0;
      for (const [, group] of groups) {
        if (group.length <= 1) continue;
        const sorted = group.sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());
        const keep = sorted[0];
        const duplicates = sorted.slice(1);

        for (const dup of duplicates) {
          await this.supabase.db.from('orders').update({ customer_id: keep.id }).eq('customer_id', dup.id);
          await this.supabase.db.from('whatsapp_messages').update({ customer_id: keep.id }).eq('customer_id', dup.id);
          await this.supabase.db.from('conversation_sessions').update({ /* no customer_id field, skip */ });
          await this.supabase.db.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', dup.id);
          merged++;
        }
      }

      return { merged, total: groups.size };
    } catch (e) {
      return { error: 'Dedup failed', detail: String(e) };
    }
  }

  @Post('fix-names/:tenantId')
  async fixNames(@Param('tenantId') tenantId: string) {
    const fixes: Record<string, string> = {
      '05321234567': 'Mehmet Yilmaz',
      '05339876543': 'Ayse Demir',
      '05411223344': 'Ali Kaya',
      '05449876543': 'Fatma Sahin',
      '05551234567': 'Mustafa Ozturk',
      '05328765432': 'Zeynep Arslan',
      '05438765432': 'Ibrahim Yildiz',
      '05559876543': 'Hatice Celik',
      '05321239876': 'Ahmet Kurt',
      '05411239876': 'Elif Koc',
    };
    let fixed = 0;
    for (const [phone, name] of Object.entries(fixes)) {
      const { error } = await this.supabase.db
        .from('customers')
        .update({ name })
        .eq('tenant_id', tenantId)
        .eq('phone', phone);
      if (!error) fixed++;
    }
    return { fixed, total: Object.keys(fixes).length };
  }
}
