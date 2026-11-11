import { Injectable } from '@nestjs/common';
import { SupabaseService } from './supabase.client';
import { AliasEngineService } from '../alias-engine/alias-engine.service';

/**
 * Ürün adı → tek kanonik ürün satırı.
 * Aynı isimde birden çok kayıt varsa en düşük fiyatlı aktif kayıt seçilir.
 * Katalog (AI prompt) ve sipariş motoru aynı satırı kullanır; toplam 0 hatası önlenir.
 */
@Injectable()
export class ProductLookupService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly aliasEngine: AliasEngineService,
  ) {}

  async listActive(tenantId: string): Promise<Record<string, unknown>[]> {
    const { data } = await this.supabase.db
      .from('products')
      .select(
        'id, product_name, category, price, unit, sale_types, variable_weight, avg_weight_gr, min_weight_gr, max_weight_gr, ai_rules, min_order_qty, wholesale_price, wholesale_min_qty, active, created_at',
      )
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('product_name');

    const rows = (data || []) as Record<string, unknown>[];
    const byName = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      const key = String(row.product_name || '').trim().toLocaleLowerCase('tr-TR');
      if (!key) continue;
      const current = byName.get(key);
      if (!current || Number(row.price || 0) < Number(current.price || 0)) {
        byName.set(key, row);
      }
    }
    return Array.from(byName.values()).sort((a, b) =>
      String(a.product_name || '').localeCompare(String(b.product_name || ''), 'tr'),
    );
  }

  async findByName(tenantId: string, name: string): Promise<Record<string, unknown> | null> {
    let clean = String(name || '').trim();
    if (!clean) return null;

    // "sucuk" tek başına belirsiz: çeşit sorulmalı, varsayılan ürün seçilmemeli.
    const key = clean.toLocaleLowerCase('tr-TR');
    const hasType = /kangal|sap|acısız|acisiz|acılı|acili|normal|dana|parmak|kuzu|ceviz|isot|bahar/.test(key);
    if (key === 'sucuk' || (key.includes('sucuk') && !hasType)) return null;

    // Alias: sap/acısız/normal/kangal sucuk -> kanonik ürün (örn. Kangal Sucuk).
    try {
      const resolved = await this.aliasEngine.resolve(tenantId, clean);
      if (resolved.matched) clean = resolved.productName;
    } catch { /* yoksay */ }

    const { data } = await this.supabase.db
      .from('products')
      .select('id, product_name, price, wholesale_price, wholesale_min_qty, active')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .eq('product_name', clean)
      .order('price', { ascending: true })
      .limit(1);
    if (data && data.length > 0) return (data[0] as Record<string, unknown>) || null;

    const fallback = await this.supabase.db
      .from('products')
      .select('id, product_name, price, wholesale_price, wholesale_min_qty, active')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .ilike('product_name', `%${clean}%`)
      .order('price', { ascending: true })
      .limit(1);
    return ((fallback.data?.[0] as Record<string, unknown> | undefined) || null);
  }
}
