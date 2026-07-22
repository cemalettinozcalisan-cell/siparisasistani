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
      const saleTypes = (p['sale_types'] as string[]) || ['KG'];
      const unit = p['unit'] || 'KG';
      const category = p['category'] || '';
      const variableWeight = p['variable_weight'];
      const aiRules = p['ai_rules'] as string || '';

      const typeStr = saleTypes.join(' / ');
      let line = `- ${name}: ${price} TL / ${typeStr}`;
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
    lines.push('- Değişken ağırlıklı ürünlerde (sap gibi) müşteriye kesin fiyat yerine "tartımdan sonra netleşir" de.');
    lines.push('- Müşteri kg fiyatı sorarsa ürünün kg fiyatını söyle. Sap fiyatı sorarsa "ağırlık değiştiği için kg üzerinden hesaplanır" de.');
    lines.push('- Her ürünün birden çok satış tipi olabilir. Müşterinin söylediği birime göre satış tipini belirle.');

    return lines.join('\n');
  }

  async findProduct(tenantId: string, productName: string) {
    const { data } = await this.supabase.db
      .from('products')
      .select('id, product_name, price, unit, sale_types, variable_weight, avg_weight_gr, min_weight_gr, max_weight_gr, ai_rules')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .ilike('product_name', `%${productName}%`)
      .limit(5);
    return data || [];
  }

  private async loadProducts(tenantId: string) {
    const { data } = await this.supabase.db
      .from('products')
      .select('product_name, category, price, unit, sale_types, variable_weight, avg_weight_gr, min_weight_gr, max_weight_gr, ai_rules')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('product_name');
    if (data) this.cache.set(tenantId, data);
    return data;
  }
}
