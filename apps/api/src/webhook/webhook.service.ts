import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { ChannelHealthService } from '../channel-health/channel-health.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly channelHealth: ChannelHealthService,
  ) {}

  async receiveOrder(tenantId: string, platform: string, payload: Record<string, unknown>) {
    this.logger.log(`Webhook order from ${platform} for tenant ${tenantId}`);

    try {
    // Normalize common order fields from various platforms
    const orderData = this.normalizeOrder(platform, payload);
    if (!orderData) {
      this.logger.warn(`Unsupported platform: ${platform}`);
      return { error: 'Unsupported platform' };
    }

    // Find or create customer
    const { data: existing } = await this.supabase.db
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('phone', orderData.phone)
      .maybeSingle();

    let customerId = existing?.id;
    if (!customerId) {
      const { data: newCustomer } = await this.supabase.db
        .from('customers')
        .insert({ tenant_id: tenantId, name: orderData.name, phone: orderData.phone, address: orderData.address, city: orderData.city })
        .select('id')
        .single();
      customerId = newCustomer?.id;
    }

    // Create order
    const { data: order } = await this.supabase.db
      .from('orders')
      .insert({
        tenant_id: tenantId,
        customer_id: customerId,
        order_number: orderData.orderNumber,
        channel: 'manual',
        source: 'WEBSITE',
        status: 'new',
        payment_method: orderData.payment || 'website',
        payment_status: 'waiting',
        total_price: orderData.total,
        notes: orderData.notes || null,
        customer_note: orderData.customerNote || null,
      })
      .select()
      .single();

    // Create order items if provided
    const items = (orderData.items || []) as Record<string, unknown>[];
    if (order && items.length > 0) {
      await this.supabase.db.from('order_items').insert(
        items.map((item: Record<string, unknown>) => ({
          order_id: order.id,
          product_name: item.name,
          quantity: item.quantity,
          unit: item.unit || 'ADET',
          unit_price: item.price,
          total: Number(item.quantity) * Number(item.price),
        }))
      );
    }

    // Kanal sağlığı: web'den sipariş başarıyla düştü
    await this.channelHealth.record(tenantId, 'website', true);
    return { status: 'created', order_id: order?.id, order_number: orderData.orderNumber };
    } catch (err) {
      this.logger.error(`Webhook order failed for ${platform} tenant ${tenantId}: ${(err as Error).message}`);
      // Kanal sağlığı: web'den sipariş düşmedi (kritik)
      await this.channelHealth.record(tenantId, 'website', false, { error: (err as Error).message, errorCode: 'WEBHOOK_FAILED' });
      return { error: (err as Error).message };
    }
  }

  private normalizeOrder(platform: string, payload: Record<string, unknown>): Record<string, unknown> | null {
    switch (platform) {
      case 'woocommerce':
        return {
          orderNumber: String(payload.number || payload.id || ''),
          name: `${(payload.billing as Record<string, unknown>)?.first_name || ''} ${(payload.billing as Record<string, unknown>)?.last_name || ''}`.trim(),
          phone: String(((payload.billing as Record<string, unknown>)?.phone as string) || ''),
          address: `${(payload.billing as Record<string, unknown>)?.address_1 || ''} ${(payload.billing as Record<string, unknown>)?.address_2 || ''}`.trim(),
          city: String((payload.billing as Record<string, unknown>)?.city || ''),
          total: Number(payload.total || 0),
          payment: String(payload.payment_method || 'website'),
          notes: String(payload.customer_note || ''),
          customerNote: String(payload.customer_note || ''),
          items: (payload.line_items as Record<string, unknown>[] || []).map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            unit: 'ADET',
          })),
        };
      case 'shopify':
        return {
          orderNumber: String(payload.name || payload.id || ''),
          name: `${(payload.customer as Record<string, unknown>)?.first_name || ''} ${(payload.customer as Record<string, unknown>)?.last_name || ''}`.trim(),
          phone: String((payload.customer as Record<string, unknown>)?.phone || payload.phone || ''),
          address: String((payload.shipping_address as Record<string, unknown>)?.address1 || ''),
          city: String((payload.shipping_address as Record<string, unknown>)?.city || ''),
          total: Number(payload.total_price || 0),
          payment: String(payload.gateway || 'website'),
          notes: String(payload.note || ''),
          customerNote: String(payload.note || ''),
          items: (payload.line_items as Record<string, unknown>[] || []).map((item) => ({
            name: item.title,
            quantity: item.quantity,
            price: item.price,
            unit: 'ADET',
          })),
        };
      default:
        // Custom API format
        return {
          orderNumber: String(payload.order_number || payload.id || ''),
          name: String(payload.customer_name || payload.name || ''),
          phone: String(payload.customer_phone || payload.phone || ''),
          address: String(payload.address || ''),
          city: String(payload.city || ''),
          total: Number(payload.total_price || payload.total || 0),
          payment: String(payload.payment_method || 'website'),
          notes: String(payload.notes || ''),
          customerNote: String(payload.customer_note || ''),
          items: (payload.items as Record<string, unknown>[] || []).map((item) => ({
            name: item.name || item.product_name,
            quantity: item.quantity,
            price: item.price || item.unit_price,
            unit: item.unit || 'ADET',
          })),
        };
    }
  }
}
