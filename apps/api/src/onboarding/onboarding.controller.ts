import { Controller, Post, Body } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly supabase: SupabaseService) {}

  @Post()
  async setup(@Body() body: {
    companyName: string;
    domain: string;
    phone: string;
    email: string;
    iban: string;
    products: { product_name: string; price: number; unit: string }[];
  }) {
    const { data: tenant, error: tenantError } = await this.supabase.db
      .from('tenants')
      .insert({
        company_name: body.companyName,
        domain: body.domain,
        phone: body.phone,
        email: body.email,
        iban: body.iban,
        status: 'active',
      })
      .select()
      .single();

    if (tenantError) throw new Error(`Tenant creation failed: ${tenantError.message}`);

    await this.supabase.db.from('tenant_settings').insert({ tenant_id: tenant.id });

    if (body.products && body.products.length > 0) {
      const productItems = body.products.map((p) => ({
        tenant_id: tenant.id,
        product_name: p.product_name,
        price: p.price,
        unit: p.unit,
      }));
      await this.supabase.db.from('products').insert(productItems);
    }

    return { tenantId: tenant.id, companyName: tenant.company_name };
  }
}
