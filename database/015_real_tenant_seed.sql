-- ============================================================
-- SiparişAsistanı - Gerçek Tenant Seed (Test Verisi)
-- ============================================================

-- Tenant: Ahmet İpek Sucukları
insert into tenants (id, company_name, domain, phone, email, iban, address, city, tax_number)
values ('11111111-1111-1111-1111-111111111111', 'Ahmet İpek Sucukları', 'ahmetipek',
  '05321234567', 'info@ahmetipek.com',
  'TR12 0001 2345 6789 0001 2345 67',
  'Küçük Sanayi Sitesi No:42', 'Afyonkarahisar', '1234567890')
on conflict (id) do nothing;

-- Kullanıcı
insert into users (id, tenant_id, name, email, phone, password, role)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
  'Ahmet İpek', 'ahmet@ahmetipek.com', '05321234567', '$2a$10$placeholder', 'owner')
on conflict (id) do nothing;

-- Tenant Settings (Brand Voice + Yöresel)
insert into tenant_settings (tenant_id, voice_gender, brand_voice, greeting_style, ai_style,
  iban_enabled, human_transfer_enabled, callback_enabled, record_calls)
values ('11111111-1111-1111-1111-111111111111',
  'male', 'yoresel', 'firma_ad', 'yoresel',
  true, true, true, true)
on conflict (tenant_id) do nothing;

-- Ürünler (Gerçek esnaf ürünleri - çoklu satış tipi ile)
insert into products (tenant_id, product_name, category, price, unit, sale_types, variable_weight, avg_weight_gr, min_weight_gr, max_weight_gr, ai_rules) values
  ('11111111-1111-1111-1111-111111111111', 'Dana Parmak Sucuk', 'Sucuk', 890, 'KG', '["KG","SAP"]', true, 600, 500, 700, 'Sap ağırlığı üretime göre 500-700gr arası değişir. Net fiyat tartımdan sonra hesaplanır.'),
  ('11111111-1111-1111-1111-111111111111', 'Acılı Parmak Sucuk', 'Sucuk', 920, 'KG', '["KG","SAP"]', true, 600, 500, 700, 'Sap ağırlığı değişkendir.'),
  ('11111111-1111-1111-1111-111111111111', 'Kangal Sucuk', 'Sucuk', 750, 'KG', '["KG"]', false, null, null, null, null),
  ('11111111-1111-1111-1111-111111111111', 'Kavurma', 'Kavurma', 650, 'KG', '["KG","KOLI"]', false, null, null, null, 'Koli: 5 kg'),
  ('11111111-1111-1111-1111-111111111111', 'Pastırma', 'Pastırma', 1200, 'KG', '["KG"]', false, null, null, null, null),
  ('11111111-1111-1111-1111-111111111111', 'Tulum Peyniri', 'Peynir', 380, 'KG', '["KG"]', false, null, null, null, null),
  ('11111111-1111-1111-1111-111111111111', 'Afyon Kaymak', 'Kaymak', 450, 'KG', '["KG","KUTU"]', false, null, null, null, 'Kutu: 500 gr')
on conflict do nothing;

-- Örnek Müşteri
insert into customers (id, tenant_id, name, phone, email, address, city)
values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
  'Mehmet Yılmaz', '05339876543', 'mehmet@example.com',
  'Çankaya Mah. No:10', 'Ankara')
on conflict (id) do nothing;

-- Kampanya
insert into campaigns (tenant_id, title, description, condition, offer, min_quantity, target_product, start_date, end_date, active)
values ('11111111-1111-1111-1111-111111111111',
  'Yaz Kampanyası',
  '2 kilo ve üzeri sucuk alımlarında yarım kilo kavurma %20 indirimli',
  '2 KG ve üzeri sucuk alımında',
  '500 gr Kavurma %20 indirimli',
  2, 'Sucuk',
  '2026-01-01', '2026-12-31', true)
on conflict do nothing;
