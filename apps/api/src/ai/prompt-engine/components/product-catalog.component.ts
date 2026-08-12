import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../../common/supabase.client';
import { PromptContext } from '../prompt-engine.service';

@Injectable()
export class ProductCatalogComponent {
  private readonly logger = new Logger(ProductCatalogComponent.name);
  private cache: Map<string, unknown[]> = new Map();

  constructor(private readonly supabase: SupabaseService) {}

  async render(ctx: PromptContext): Promise<string> {
    const cached = this.cache.get(ctx.tenantId);
    const products = cached || await this.loadProducts(ctx.tenantId);

    if (!products || products.length === 0) return '';

    const lines: string[] = ['[ÜRÜN KATALOĞU - SADECE BU ÜRÜNLERİ KULLAN]'];

    for (const p of products as Record<string, unknown>[]) {
      const name = p['product_name'] || '';
      const price = Number(p['price'] || 0).toLocaleString('tr-TR');
      const wholesalePrice = p['wholesale_price'] ? Number(p['wholesale_price']).toLocaleString('tr-TR') : null;
      const minOrder = Number(p['min_order_qty'] || 0);
      const raw = p['sale_types'];
      const saleTypes: string[] = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : ['KG']);
      const unit = p['unit'] || 'KG';
      const category = p['category'] || '';
      const variableWeight = p['variable_weight'];
      const aiRules = p['ai_rules'] as string || '';

      const typeStr = saleTypes.join(' / ');
      let line = `- ${name}: ${price} TL / ${typeStr}`;
      if (wholesalePrice) line += ` [Toptan: ${wholesalePrice} TL/${unit}]`;
      if (minOrder > 0) line += ` [Min. Sipariş: ${minOrder} ${saleTypes[0]}]`;
      if (category) line += ` (${category})`;

      if (variableWeight && saleTypes.includes('SAP')) {
        const avg = p['avg_weight_gr'];
        const minW = p['min_weight_gr'];
        const maxW = p['max_weight_gr'];
        line += ` [Değişken ağırlıklı ürün: sap başına ~${avg || '?'}gr (${minW || '?'}-${maxW || '?'}gr arası)]`;
      }

      if (aiRules) {
        line += ` | Kural: ${aiRules}`;
      }

      lines.push(line);
    }

    lines.push('');
    lines.push('SATIŞ KURALLARI:');
    lines.push('- KG = kilogram ile satılır. Müşteri "2 kilo" derse KG olarak al.');
    lines.push('- SAP = adet ile satılır, her bir sapın ağırlığı değişebilir. Müşteri "2 sap" derse adet olarak al.');
    lines.push('- ADET = tek tek satılır. Müşteri "5 tane" derse adet olarak al.');
    lines.push('- KOLI = koli bazında satılır.');
    lines.push('- TEPSI = tepsi bazında satılır. Müşteri "tepsi" derse tepsi olarak al.');
    lines.push('- PALET = palet bazında satılır. Müşteri "palet" derse palet olarak al.');
    lines.push('- TOPLAM ALGISI: Müşteri "10 tepsi", "30 koli", "2 palet" gibi büyük miktarlar söylüyorsa TOPTAN sipariş olarak değerlendir. source="WHOLESALE" kullan.');
    lines.push('- Müşteri perakende miktarlarda (1-5 kg, 1-2 adet gibi) source="PERAKENDE" kullan.');
    lines.push('- Toptan müşterilerde özel fiyat varsa onu kullan, yoksa normal fiyatı kullan.');
    lines.push('- Değişken ağırlıklı ürünlerde (sap gibi) müşteriye kesin fiyat yerine "tartımdan sonra netleşir" de.');
    lines.push('- Müşteri kg fiyatı sorarsa ürünün kg fiyatını söyle. Sap fiyatı sorarsa "ağırlık değiştiği için kg üzerinden hesaplanır" de.');
    lines.push('- Her ürünün birden çok satış tipi olabilir. Müşterinin söylediği birime göre satış tipini belirle.');

    return lines.join('\n');
  }

  async findProduct(tenantId: string, productName: string) {
    const { data } = await this.supabase.db
      .from('products')
      .select('id, product_name, price, unit, sale_types, variable_weight, avg_weight_gr, min_weight_gr, max_weight_gr, ai_rules, min_order_qty, wholesale_price')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .ilike('product_name', `%${productName}%`)
      .limit(5);
    return data || [];
  }

  private async loadProducts(tenantId: string) {
    const { data } = await this.supabase.db
      .from('products')
      .select('product_name, category, price, unit, sale_types, variable_weight, avg_weight_gr, min_weight_gr, max_weight_gr, ai_rules, min_order_qty, wholesale_price')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('product_name');
    if (data) this.cache.set(tenantId, data);
    return data;
  }
}
