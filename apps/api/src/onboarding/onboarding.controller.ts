import { Controller, Post, Body } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import * as crypto from 'crypto';

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
    whatsapp?: string;
    address?: string;
    city?: string;
    taxNumber?: string;
    sector?: string;
    identityNumber?: string;
    taxOffice?: string;
    logoUrl?: string;
    products: { product_name: string; category?: string; price: number; unit: string; sale_types?: string[] }[];
    cargoCompanies?: string[];
    voiceGender?: string;
    brandVoice?: string;
    greetingStyle?: string;
    businessHoursStart?: string;
    businessHoursEnd?: string;
    businessHoursEnabled?: boolean;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    loadDemoData?: boolean;
  }) {
    // 1. Create tenant
    const { data: tenant, error: tenantError } = await this.supabase.db
      .from('tenants')
      .insert({
        company_name: body.companyName,
        domain: body.domain || body.companyName.toLowerCase().replace(/\s+/g, ''),
        phone: body.phone,
        email: body.email,
        iban: body.iban,
        address: body.address || null,
        city: body.city || null,
        tax_number: body.taxNumber || null,
        logo_url: body.logoUrl || null,
        status: 'active',
      })
      .select()
      .single();

    if (tenantError) throw new Error(`Tenant creation failed: ${tenantError.message}`);

    // 2. Create tenant settings
    await this.supabase.db.from('tenant_settings').insert({
      tenant_id: tenant.id,
      voice_gender: body.voiceGender || 'female',
      brand_voice: body.brandVoice || 'yoresel',
      greeting_style: body.greetingStyle || 'firma_ad',
      business_hours_enabled: body.businessHoursEnabled || false,
      business_hours_start: body.businessHoursStart || '08:00',
      business_hours_end: body.businessHoursEnd || '18:30',
      iban_enabled: !!body.iban,
      human_transfer_enabled: true,
      callback_enabled: true,
      record_calls: true,
      record_whatsapp: true,
      sector: body.sector || 'genel',
      identity_number: body.identityNumber || null,
      tax_office: body.taxOffice || null,
    });

    // 3. Cargo settings
    if (body.cargoCompanies && body.cargoCompanies.length > 0) {
      const cargoUpdates: Record<string, unknown> = {};
      body.cargoCompanies.forEach((co) => {
        cargoUpdates[`${co}_enabled`] = true;
        cargoUpdates[`${co}_price`] = 0;
      });
      await this.supabase.db.from('tenant_settings').update(cargoUpdates).eq('tenant_id', tenant.id);
    }

    // 4. Create owner user
    const passwordHash = crypto.createHash('sha256').update(body.ownerPassword).digest('hex');
    const { data: owner, error: userError } = await this.supabase.db
      .from('users')
      .insert({
        tenant_id: tenant.id,
        name: body.ownerName,
        email: body.ownerEmail,
        phone: body.phone,
        password: passwordHash,
        role: 'owner',
        active: true,
      })
      .select()
      .single();

    if (userError) throw new Error(`User creation failed: ${userError.message}`);

    // 5. Create products
    if (body.products && body.products.length > 0) {
      const productItems = body.products.map((p) => ({
        tenant_id: tenant.id,
        product_name: p.product_name,
        category: p.category || null,
        price: p.price,
        unit: p.unit,
        sale_types: p.sale_types ? JSON.stringify(p.sale_types) : '["KG"]',
        active: true,
      }));
      await this.supabase.db.from('products').insert(productItems);
    }

    // 6. Create default campaign
    await this.supabase.db.from('campaigns').insert({
      tenant_id: tenant.id,
      title: 'Hos Geldin Kampanyasi',
      condition: 'Ilk siparisinizde gecerli',
      offer: 'Gorusmekten memnuniyet duyariz',
      active: true,
    });

    // 7. Demo data (optional)
    if (body.loadDemoData) {
      const demoProducts = [
        { product_name: 'Urun 1', price: 100, unit: 'KG', category: 'Genel' },
        { product_name: 'Urun 2', price: 200, unit: 'KG', category: 'Genel' },
        { product_name: 'Urun 3', price: 300, unit: 'ADET', category: 'Genel' },
      ];
      await this.supabase.db.from('products').insert(
        demoProducts.map((p) => ({ ...p, tenant_id: tenant.id, sale_types: '["KG"]', active: true }))
      );
    }

    return {
      tenantId: tenant.id,
      companyName: tenant.company_name,
      ownerEmail: body.ownerEmail,
      message: 'Kurulum basariyla tamamlandi',
    };
  }
}
