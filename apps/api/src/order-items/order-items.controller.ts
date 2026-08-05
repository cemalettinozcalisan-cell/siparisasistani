import { Controller, Get, Param } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

const MOCK_ITEMS: Record<string, Record<string, unknown>[]> = {
  'ord-001': [{ product_name: 'Dana Parmak Sucuk', quantity: 2, unit: 'KG', unit_price: 890, total: 1780 }],
  'ord-002': [{ product_name: 'Kangal Sucuk', quantity: 3, unit: 'KG', unit_price: 750, total: 2250 }, { product_name: 'Pastırma', quantity: 2, unit: 'KG', unit_price: 1125, total: 2250 }],
  'ord-003': [{ product_name: 'Yumurta (30 Koli)', quantity: 30, unit: 'KOLI', unit_price: 850, total: 25500 }, { product_name: 'Palet Taşıma', quantity: 2, unit: 'PALET', unit_price: 1500, total: 3000 }],
  'ord-004': [{ product_name: 'Bükme (Tepsi)', quantity: 12, unit: 'TEPSI', unit_price: 1300, total: 15600 }],
  'ord-005': [{ product_name: 'Afyon Kaymak', quantity: 2, unit: 'KG', unit_price: 460, total: 920 }],
  'ord-006': [{ product_name: 'Tulum Peyniri', quantity: 4, unit: 'KG', unit_price: 800, total: 3200 }],
  'ord-007': [{ product_name: 'Afyon Ekşi Maya Ekmek', quantity: 10, unit: 'ADET', unit_price: 50, total: 500 }, { product_name: 'Haşhaşlı Övme', quantity: 2, unit: 'KG', unit_price: 350, total: 700 }],
  'ord-008': [{ product_name: 'Lokum (Sultan Kaymaklı)', quantity: 2, unit: 'KG', unit_price: 320, total: 640 }],
  'ord-009': [{ product_name: 'Kavurma', quantity: 2, unit: 'KG', unit_price: 650, total: 1300 }, { product_name: 'Dana Parmak Sucuk', quantity: 1, unit: 'KG', unit_price: 890, total: 890 }, { product_name: 'Tulum Peyniri', quantity: 1, unit: 'KG', unit_price: 260, total: 260 }],
  'ord-010': [{ product_name: 'Afyon Kaymak', quantity: 1, unit: 'KG', unit_price: 460, total: 460 }, { product_name: 'Kangal Sucuk', quantity: 1, unit: 'KG', unit_price: 430, total: 430 }],
  'ord-016': [{ product_name: 'Kangal Sucuk', quantity: 2, unit: 'KG', unit_price: 750, total: 1500 }],
  'ord-017': [{ product_name: 'Acılı Parmak Sucuk', quantity: 2, unit: 'KG', unit_price: 920, total: 1840 }],
  'ord-018': [{ product_name: 'Dana Parmak Sucuk', quantity: 2, unit: 'KG', unit_price: 890, total: 1780 }, { product_name: 'Kaymak', quantity: 2, unit: 'KG', unit_price: 450, total: 900 }],
};

@Controller('order-items')
export class OrderItemsController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get(':orderId')
  async getItems(@Param('orderId') orderId: string) {
    try {
      const { data } = await this.supabase.db
        .from('order_items')
        .select('product_name, quantity, unit, unit_price, total')
        .eq('order_id', orderId);
      if (data && data.length > 0) return data;
    } catch {}

    // Mock data fallback for demo orders
    if (MOCK_ITEMS[orderId]) return MOCK_ITEMS[orderId];

    // Default mock for any order ID
    return [
      { product_name: 'Dana Parmak Sucuk', quantity: 2, unit: 'KG', unit_price: 890, total: 1780 },
      { product_name: 'Pastırma', quantity: 1, unit: 'KG', unit_price: 1200, total: 1200 },
    ];
  }
}
