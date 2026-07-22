import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Injectable()
export class AliasEngineService {
  private readonly logger = new Logger(AliasEngineService.name);
  private cache: Map<string, Map<string, string>> = new Map();

  constructor(private readonly supabase: SupabaseService) {}

  async resolve(tenantId: string, rawProductName: string): Promise<{
    productName: string;
    matched: boolean;
    confidence: number;
  }> {
    const aliases = await this.getAliasMap(tenantId);
    const clean = rawProductName.toLowerCase().trim();

    // Direct match first
    if (aliases.has(clean)) {
      return { productName: aliases.get(clean)!, matched: true, confidence: 100 };
    }

    // Partial match
    for (const [alias, product] of aliases) {
      if (clean.includes(alias) || alias.includes(clean)) {
        return { productName: product, matched: true, confidence: 85 };
      }
    }

    // Word match (e.g. "sucuk" matches "Dana Parmak Sucuk")
    const words = clean.split(/\s+/);
    for (const word of words) {
      if (word.length < 2) continue;
      for (const [alias, product] of aliases) {
        if (alias.includes(word)) {
          return { productName: product, matched: true, confidence: 75 };
        }
      }
    }

    return { productName: rawProductName, matched: false, confidence: 30 };
  }

  async getAliasMap(tenantId: string): Promise<Map<string, string>> {
    if (this.cache.has(tenantId)) return this.cache.get(tenantId)!;

    const map = new Map<string, string>();

    // Load product names
    const { data: products } = await this.supabase.db
      .from('products')
      .select('product_name')
      .eq('tenant_id', tenantId)
      .eq('active', true);

    for (const p of products || []) {
      const key = p.product_name.toLowerCase();
      map.set(key, p.product_name);
      // Auto-alias: first word
      const firstWord = key.split(/\s+/)[0];
      if (firstWord && firstWord.length > 2) map.set(firstWord, p.product_name);
    }

    // Load manual aliases
    const { data: aliases } = await this.supabase.db
      .from('product_aliases')
      .select('alias, product_id')
      .eq('tenant_id', tenantId);

    if (aliases) {
      const productMap = new Map((products || []).map((p: Record<string, unknown>) => [p.id as string, p.product_name as string]));
      for (const a of aliases) {
        const productName = productMap.get(a.product_id as string);
        if (productName) map.set((a.alias as string).toLowerCase(), productName);
      }
    }

    this.cache.set(tenantId, map);
    return map;
  }

  invalidateCache(tenantId: string) {
    this.cache.delete(tenantId);
  }
}
