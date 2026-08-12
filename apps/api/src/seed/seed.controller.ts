import { Controller, Post } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import * as crypto from 'crypto';

const TENANTS = [
  {
    name: 'Danet Sucuk',
    sector: 'sucuk',
    domain: 'danet',
    phone: '05321115001',
    email: 'info@danet.com.tr',
    city: 'Afyonkarahisar',
    address: 'Kocatepe Mah. AFYON',
    taxOffice: 'Afyon',
    identityNumber: '12345678901',
    ownerName: 'Ahmet Danet',
    ownerEmail: 'ahmet@danet.com.tr',
    ownerPassword: 'sucuk123',
    products: [
      { product_name: 'Kangal Sucuk (Fermente)', price: 1450, unit: 'KG', category: 'Sucuk' },
      { product_name: 'Tescilli Afyon Sucuğu', price: 1680, unit: 'KG', category: 'Sucuk' },
      { product_name: 'Örgü Sucuk', price: 1450, unit: 'KG', category: 'Sucuk' },
      { product_name: 'Evlik Sucuk', price: 1550, unit: 'KG', category: 'Sucuk' },
      { product_name: 'Dana Pastırma', price: 1700, unit: 'KG', category: 'Pastırma' },
      { product_name: 'Dana Kavurma', price: 2900, unit: 'KG', category: 'Kavurma' },
      { product_name: 'Füme Dana Kaburga', price: 2800, unit: 'KG', category: 'Füme' },
      { product_name: 'Dana Salam (Baton)', price: 850, unit: 'KG', category: 'Salam' },
      { product_name: 'Dana Sosis', price: 650, unit: 'KG', category: 'Sosis' },
      { product_name: 'Dana Jambon', price: 600, unit: 'KG', category: 'Jambon' },
    ],
  },
  {
    name: 'Öz Taylan Yayla Lokum',
    sector: 'lokum',
    domain: 'taylan',
    phone: '05321115002',
    email: 'info@oztaylanyayla.com',
    city: 'Afyonkarahisar',
    address: 'Merkez Mah. AFYON',
    taxOffice: 'Afyon',
    identityNumber: '10987654321',
    ownerName: 'Mehmet Taylan',
    ownerEmail: 'mehmet@taylan.com.tr',
    ownerPassword: 'lokum123',
    products: [
      { product_name: 'Antep Fıstıklı Lokum', price: 1200, unit: 'KG', category: 'Lokum' },
      { product_name: 'Çifte Kavrulmuş Lokum', price: 1100, unit: 'KG', category: 'Lokum' },
      { product_name: 'Dubai Çikolatalı Lokum', price: 800, unit: 'KG', category: 'Lokum' },
      { product_name: 'Oreolu Lokum', price: 700, unit: 'KG', category: 'Lokum' },
      { product_name: 'Kaymaklı Lokum', price: 600, unit: 'KG', category: 'Lokum' },
      { product_name: 'Sultan Kaymaklı Lokum', price: 600, unit: 'KG', category: 'Lokum' },
      { product_name: 'Baklava Lokum', price: 1000, unit: 'KG', category: 'Lokum' },
      { product_name: 'Karışık Lokum', price: 1000, unit: 'KG', category: 'Lokum' },
      { product_name: 'Gül Lokumu', price: 900, unit: 'KG', category: 'Lokum' },
      { product_name: 'Çikolata Kaplı Antep Fıstıklı', price: 750, unit: 'KG', category: 'Lokum' },
    ],
  },
  {
    name: 'Kayra Börek',
    sector: 'bukme',
    domain: 'kayra',
    phone: '05321115003',
    email: 'info@kayraborek.com',
    city: 'Afyonkarahisar',
    address: 'Ambaryolu Kadınana Cad. No:73 AFYON',
    taxOffice: 'Afyon',
    identityNumber: '98765432101',
    ownerName: 'Mustafa Kayra',
    ownerEmail: 'mustafa@kayraborek.com',
    ownerPassword: 'bukme123',
    products: [
      { product_name: 'Mercimekli Bükme', price: 350, unit: 'KG', category: 'Bükme' },
      { product_name: 'Patatesli Bükme', price: 350, unit: 'KG', category: 'Bükme' },
      { product_name: 'Peynirli Ağzıaçık', price: 500, unit: 'KG', category: 'Ağzıaçık' },
      { product_name: 'Kıymalı Ağzıaçık', price: 550, unit: 'KG', category: 'Ağzıaçık' },
      { product_name: 'Haşhaşlı Katmer', price: 90, unit: 'ADET', category: 'Katmer' },
      { product_name: 'Bol Haşhaşlı Katmer', price: 110, unit: 'ADET', category: 'Katmer' },
      { product_name: 'Haşhaşlı Hamursuz', price: 120, unit: 'ADET', category: 'Hamursuz' },
      { product_name: 'Haşhaşlı Öğme', price: 120, unit: 'ADET', category: 'Öğme' },
      { product_name: 'Peynirli Börek', price: 70, unit: 'ADET', category: 'Börek' },
      { product_name: 'Ispanaklı Börek', price: 55, unit: 'ADET', category: 'Börek' },
    ],
  },
  {
    name: 'Evrenkaya Yumurta',
    sector: 'yumurta',
    domain: 'evrenkaya',
    phone: '05321115004',
    email: 'info@evrenkaya.com.tr',
    city: 'Afyonkarahisar',
    address: 'Beyazıt Mh. Eski Sülümenli Yolu Küme Evleri No:33 AFYON',
    taxOffice: 'Afyon',
    identityNumber: '45678912301',
    ownerName: 'Veli Evren',
    ownerEmail: 'veli@evrenkaya.com.tr',
    ownerPassword: 'yumurta123',
    products: [
      { product_name: 'M Boy 30lu Koli Yumurta', price: 100, unit: 'KOLİ', category: 'Yumurta' },
      { product_name: 'L Boy 30lu Koli Yumurta', price: 120, unit: 'KOLİ', category: 'Yumurta' },
      { product_name: 'XL Boy 20li Koli Yumurta', price: 130, unit: 'KOLİ', category: 'Yumurta' },
      { product_name: 'L Boy 15li Viyol Yumurta', price: 70, unit: 'ADET', category: 'Yumurta' },
      { product_name: 'Serbest Gezen 10lu Yumurta', price: 90, unit: 'ADET', category: 'Yumurta' },
      { product_name: 'M Boy 15li Viyol Yumurta', price: 55, unit: 'ADET', category: 'Yumurta' },
      { product_name: 'L Boy 10lu Viyol Yumurta', price: 45, unit: 'ADET', category: 'Yumurta' },
      { product_name: 'Gezen Tavuk 30lu Koli Yumurta', price: 160, unit: 'KOLİ', category: 'Yumurta' },
    ],
  },
];

@Controller('seed')
export class SeedController {
  constructor(private readonly supabase: SupabaseService) {}

  @Post('demo-tenants')
  async seed() {
    const results = [];

    for (const t of TENANTS) {
      // Check if tenant already exists
      const { data: existing } = await this.supabase.db
        .from('tenants')
        .select('id')
        .eq('domain', t.domain)
        .maybeSingle();

      if (existing) {
        results.push({ name: t.name, status: 'already_exists', tenantId: existing.id });
        continue;
      }

      // 1. Create tenant
      const { data: tenant } = await this.supabase.db
        .from('tenants')
        .insert({
          company_name: t.name,
          domain: t.domain,
          phone: t.phone,
          email: t.email,
          address: t.address,
          city: t.city,
          status: 'active',
        })
        .select()
        .single();

      const tenantId = tenant.id;

      // 2. Create owner user
      const passwordHash = crypto.createHash('sha256').update(t.ownerPassword).digest('hex');
      await this.supabase.db.from('users').insert({
        tenant_id: tenantId,
        name: t.ownerName,
        email: t.ownerEmail,
        phone: t.phone,
        password: passwordHash,
        role: 'owner',
        active: true,
      });

      // 3. Create tenant settings
      await this.supabase.db.from('tenant_settings').insert({
        tenant_id: tenantId,
        voice_gender: 'male',
        brand_voice: 'yoresel',
        greeting_style: 'firma_ad',
        ai_style: 'yoresel',
        sector: t.sector,
        identity_number: t.identityNumber,
        tax_office: t.taxOffice,
        iban_enabled: true,
        human_transfer_enabled: true,
        cash_on_delivery_enabled: true,
        card_on_delivery_enabled: true,
        call_summary_sms_enabled: true,
        business_hours_enabled: false,
      });

      // 4. Create products
      const productRows = t.products.map((p) => ({
        tenant_id: tenantId,
        product_name: p.product_name,
        price: p.price,
        unit: p.unit,
        category: p.category,
        sale_types: '["KG"]',
        active: true,
      }));
      await this.supabase.db.from('products').insert(productRows);

      results.push({
        name: t.name,
        sector: t.sector,
        status: 'created',
        tenantId,
        productCount: productRows.length,
        ownerEmail: t.ownerEmail,
        ownerPassword: t.ownerPassword,
      });
    }

    return { success: true, tenants: results };
  }
}
