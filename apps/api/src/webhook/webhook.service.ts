import { Injectable, Logger } from '@nestjs/common';
import { AiOrderInput } from '@siparis/types';
import { ChannelHealthService } from '../channel-health/channel-health.service';
import { OrderEngineService } from '../order-engine/order-engine.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly channelHealth: ChannelHealthService,
    private readonly orderEngine: OrderEngineService,
  ) {}

  async receiveOrder(tenantId: string, platform: string, payload: Record<string, unknown>) {
    this.logger.log(`Webhook order from ${platform} for tenant ${tenantId}`);

    try {
      const orderData = this.normalizeOrder(platform, payload);
      if (!orderData) {
        this.logger.warn(`Unsupported platform: ${platform}`);
        return { error: 'Unsupported platform' };
      }

      const rawItems = (orderData.items || []) as Record<string, unknown>[];
      const products = rawItems
        .map((item) => ({
          product_name: String(item.name || item.product_name || '').trim(),
          quantity: Number(item.quantity || 0),
          unit: String(item.unit || 'ADET').trim() || 'ADET',
        }))
        .filter((p) => p.product_name && p.quantity > 0);

      if (!orderData.phone || products.length === 0) {
        return { error: 'Webhook order requires phone and at least one item' };
      }

      const input: AiOrderInput = {
        customer: {
          name: String(orderData.name || '').trim(),
          phone: String(orderData.phone || '').replace(/[^\d]/g, ''),
          address: String(orderData.address || '').trim() || undefined,
          city: String(orderData.city || '').trim() || undefined,
          district: String(orderData.district || '').trim() || undefined,
        },
        products,
        payment: (String(orderData.payment || 'website') as AiOrderInput['payment']),
        confirmed: true,
        confidence: 90,
        channel: 'web',
        source: 'WEBSITE',
        notes: `Web ${platform} #${String(orderData.orderNumber || '')}${
          orderData.notes ? ' - ' + String(orderData.notes) : ''
        }`,
      };

      const order = await this.orderEngine.process(input, tenantId);
      await this.channelHealth.record(tenantId, 'website', true);
      return {
        status: 'created',
        order_id: order.order_id,
        order_number: order.order_number,
        external_order_number: orderData.orderNumber,
      };
    } catch (err) {
      this.logger.error(`Webhook order failed for ${platform} tenant ${tenantId}: ${(err as Error).message}`);
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
          district: String((payload.billing as Record<string, unknown>)?.state || ''),
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
          district: String((payload.shipping_address as Record<string, unknown>)?.province || ''),
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
          district: String(payload.district || ''),
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
