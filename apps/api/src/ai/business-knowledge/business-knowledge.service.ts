import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.client';
import { BusinessKnowledgeCard } from '@siparis/types';

@Injectable()
export class BusinessKnowledgeService {
  private readonly logger = new Logger(BusinessKnowledgeService.name);
  private cache: Map<string, BusinessKnowledgeCard> = new Map();

  constructor(private readonly supabase: SupabaseService) {}

  async getCard(tenantId: string): Promise<BusinessKnowledgeCard> {
    const cached = this.cache.get(tenantId);
    if (cached) return cached;

    const [tenantResult, productsResult, settingsResult] = await Promise.all([
      this.supabase.db.from('tenants').select('*').eq('id', tenantId).single(),
      this.supabase.db
        .from('products')
        .select('product_name, category, price, unit')
        .eq('tenant_id', tenantId)
        .eq('active', true),
      this.supabase.db
        .from('settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single(),
    ]);

    const tenant = tenantResult.data;
    const products = productsResult.data || [];
    const settings = settingsResult.data;

    const card: BusinessKnowledgeCard = {
      company_name: tenant?.company_name || '',
      working_hours: '08:00 - 18:00',
      cargo_companies: ['Yurtiçi', 'MNG', 'Aras'],
      payment_methods: this.getPaymentMethods(settings),
      products: products.map((p: { product_name: string }) => p.product_name),
      return_policy: 'Müşteri memnuniyeti önceliğimizdir.',
      faq: [],
    };

    this.cache.set(tenantId, card);
    return card;
  }

  private getPaymentMethods(settings: Record<string, unknown> | null): string[] {
    const methods: string[] = ['iban'];
    if (settings?.payment_website) methods.push('website');
    if (settings?.payment_paytr) methods.push('paytr');
    if (settings?.payment_iyzico) methods.push('iyzico');
    return methods;
  }

  invalidateCache(tenantId: string): void {
    this.cache.delete(tenantId);
  }
}
