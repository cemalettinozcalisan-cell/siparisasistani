-- ============================================================
-- SiparişAsistanı - Mevcut Tenant'a Veri Ekle
-- (tenant zaten var, ürün/kampanya ekle)
-- ============================================================

-- Tenant ID'yi bul (ahmetipek domain'inden)
do $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id from tenants where domain = 'ahmetipek' limit 1;

  -- Settings (brand voice)
  insert into tenant_settings (tenant_id, voice_gender, brand_voice, greeting_style, ai_style,
    iban_enabled, human_transfer_enabled, callback_enabled, record_calls)
  values (v_tenant_id, 'male', 'yoresel', 'firma_ad', 'yoresel',
    true, true, true, true)
  on conflict (tenant_id) do update set
    brand_voice = excluded.brand_voice,
    greeting_style = excluded.greeting_style,
    ai_style = excluded.ai_style;

  -- Ürünler
  insert into products (tenant_id, product_name, category, price, unit, sale_types, variable_weight, avg_weight_gr, min_weight_gr, max_weight_gr, ai_rules) values
    (v_tenant_id, 'Dana Parmak Sucuk', 'Sucuk', 890, 'KG', '["KG","SAP"]', true, 600, 500, 700, 'Sap ağırlığı üretime göre 500-700gr arası değişir. Net fiyat tartımdan sonra hesaplanır.'),
    (v_tenant_id, 'Acılı Parmak Sucuk', 'Sucuk', 920, 'KG', '["KG","SAP"]', true, 600, 500, 700, 'Sap ağırlığı değişkendir.'),
    (v_tenant_id, 'Kangal Sucuk', 'Sucuk', 750, 'KG', '["KG"]', false, null, null, null, null),
    (v_tenant_id, 'Kavurma', 'Kavurma', 650, 'KG', '["KG","KOLI"]', false, null, null, null, 'Koli: 5 kg'),
    (v_tenant_id, 'Pastırma', 'Pastırma', 1200, 'KG', '["KG"]', false, null, null, null, null),
    (v_tenant_id, 'Tulum Peyniri', 'Peynir', 380, 'KG', '["KG"]', false, null, null, null, null),
    (v_tenant_id, 'Afyon Kaymak', 'Kaymak', 450, 'KG', '["KG","KUTU"]', false, null, null, null, 'Kutu: 500 gr')
  on conflict do nothing;

  -- Kampanya
  insert into campaigns (tenant_id, title, description, condition, offer, min_quantity, target_product, start_date, end_date, active)
  values (v_tenant_id, 'Yaz Kampanyası', '2 kilo ve üzeri sucuk alımlarında yarım kilo kavurma %20 indirimli',
    '2 KG ve üzeri sucuk alımında', '500 gr Kavurma %20 indirimli', 2, 'Sucuk',
    '2026-01-01', '2026-12-31', true)
  on conflict do nothing;
end $$;
