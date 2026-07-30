import { Controller, Get, Param, Query, Header } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { PrintFormatService } from './print-format.service';

const MOCK_ORDER: Record<string, unknown> = {
  id: 'mock-id', order_number: '26-MOCK', total_price: 2980, status: 'new', channel: 'phone',
  source: 'PHONE', notes: '', customer_note: '',
  created_at: new Date().toISOString(),
  customer_name: 'Mehmet Öztürk', customer_phone: '05339876543', customer_address: 'Afyonkarahisar, Merkez',
};
const MOCK_ITEMS: Record<string, unknown>[] = [
  { product_name: 'Dana Parmak Sucuk', quantity: 2, unit: 'KG', unit_price: 890 },
  { product_name: 'Pastırma', quantity: 1, unit: 'KG', unit_price: 1200 },
];

@Controller('print')
export class PrintPreviewController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly format: PrintFormatService,
  ) {}

  @Get('preview/:tenantId/:orderId')
  async preview(@Param('tenantId') tenantId: string, @Param('orderId') orderId: string, @Query('format') format?: string) {
    const result = await this.getOrderData(tenantId, orderId);
    if (!result) return { error: 'Order not found' };

    if (format === 'thermal') {
      return { format: 'thermal', content: this.format.generateThermal(result.orderData, result.items) };
    }
    return { format: 'a4', content: this.format.generateA4(result.orderData, result.items) };
  }

  @Get('render/:tenantId/:orderId')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async render(@Param('tenantId') tenantId: string, @Param('orderId') orderId: string) {
    const result = await this.getOrderData(tenantId, orderId);
    if (!result) return '<h1>Order not found</h1>';
    return this.format.generateA4(result.orderData, result.items);
  }

  private async getOrderData(tenantId: string, orderId: string): Promise<{ orderData: Record<string, unknown>; items: Record<string, unknown>[] } | null> {
    // Try real data first
    try {
      const { data: order } = await this.supabase.db
        .from('orders')
        .select('*, customer:customer_id(name, phone)')
        .eq('tenant_id', tenantId)
        .eq('id', orderId)
        .maybeSingle();

      if (order) {
        const { data: items } = await this.supabase.db
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);
        return {
          orderData: {
            ...order,
            customer_name: (order.customer as Record<string, unknown>)?.name || '',
            customer_phone: (order.customer as Record<string, unknown>)?.phone || '',
          },
          items: items || [],
        };
      }
    } catch {}

    // Mock fallback for any order (demo mode)
    return {
      orderData: {
        ...MOCK_ORDER,
        order_number: `26-${orderId.slice(-4)}`,
        id: orderId,
      },
      items: MOCK_ITEMS,
    };
  }
}
