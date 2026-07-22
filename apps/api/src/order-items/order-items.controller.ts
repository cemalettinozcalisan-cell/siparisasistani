import { Controller, Get, Param } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Controller('order-items')
export class OrderItemsController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get(':orderId')
  async getItems(@Param('orderId') orderId: string) {
    const { data } = await this.supabase.db
      .from('order_items')
      .select('product_name, quantity, unit, unit_price, total')
      .eq('order_id', orderId);
    return data || [];
  }
}
