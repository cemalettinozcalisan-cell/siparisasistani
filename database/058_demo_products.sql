-- ============================================================
-- SiparişAsistanı - 058: Test ürünleri (esnaf sitelerinden)
-- Danet Sucuk (sucuk/şarküteri) + Öz Taylan Yayla Lokum (lokum)
-- Supabase SQL Editor'da çalıştır.
-- ============================================================

do $$
declare
  v_danet uuid;
  v_taylan uuid;
begin
  select id into v_danet from tenants where domain = 'danet' limit 1;
  select id into v_taylan from tenants where domain = 'taylan' limit 1;

  -- Eğer tenant yoksa biji oluşturma — sadece uyarı bırak (manuel kurulum gerekli ise)
  if v_danet is null then raise notice 'UYARI: danet tenant bulunamadı'; end if;
  if v_taylan is null then raise notice 'UYARI: taylan tenant bulunamadı'; end if;

  -- ===================== DANET SUCUK =====================
  if v_danet is not null then
    delete from products where tenant_id = v_danet;

    insert into products (tenant_id, product_name, category, price, unit, sale_types) values
    (v_danet, 'Dana Kangal Sucuk (Fermente)', 'Sucuk', 1450, 'KG', '["KG"]'),
    (v_danet, 'Dana Örgü Sucuk (Fermente)', 'Sucuk', 1450, 'KG', '["KG"]'),
    (v_danet, 'Tescilli Afyon Sucuğu Kangal (Fermente)', 'Sucuk', 1680, 'KG', '["KG"]'),
    (v_danet, 'Dana Kangal Sucuk (Fermente) 300 g', 'Sucuk', 475, 'ADET', '["ADET"]'),
    (v_danet, 'Dana Yarım Kangal Sucuk (Fermente) 180 g', 'Sucuk', 280, 'ADET', '["ADET"]'),
    (v_danet, 'Dana Sucuk Vakumlu Kangal (Fermente) 200 g', 'Sucuk', 315, 'ADET', '["ADET"]'),
    (v_danet, 'Dana Evlik Sucuk (Fermente) 400 g', 'Sucuk', 620, 'ADET', '["ADET"]'),
    (v_danet, 'Tescilli Afyon Sucuğu (Fermente) 300 g', 'Sucuk', 530, 'ADET', '["ADET"]'),
    (v_danet, 'Dana Sucuk Spesiyal Baton (Fermente) 650-700 g', 'Sucuk', 1470, 'ADET', '["ADET"]'),
    (v_danet, 'Dana Kavurma 100 g', 'Kavurma', 278, 'ADET', '["ADET"]'),
    (v_danet, 'Dana Kavurma (Kare Dilim) 250-270 g', 'Kavurma', 720, 'ADET', '["ADET"]'),
    (v_danet, 'Dana Pastırma (Çemeni Sıyrılmış) 70 g', 'Pastırma', 340, 'ADET', '["ADET"]'),
    (v_danet, 'Dana Jambon (Dilimli) 50 g', 'Jambon', 75, 'ADET', '["ADET"]'),
    (v_danet, 'Dana Fıstıklı Salam (Dilimli) 50 g', 'Salam', 70, 'ADET', '["ADET"]'),
    (v_danet, 'Dana Füme Kaburga 70 g', 'Füme', 197, 'ADET', '["ADET"]');

    raise notice 'Danet Sucuk ürünleri eklendi';
  end if;

  -- ===================== ÖZ TAYLAN YAYLA LOKUM =====================
  if v_taylan is not null then
    delete from products where tenant_id = v_taylan;

    insert into products (tenant_id, product_name, category, price, unit, sale_types) values
    (v_taylan, 'Özel Metal Kutu Premium Karışık Lokum 1350 g', 'Lokum', 1299, 'ADET', '["ADET"]'),
    (v_taylan, 'Metal Kutu Premium Çifte Kavrulmuş Karışık Lokum 650 g', 'Lokum', 700, 'ADET', '["ADET"]'),
    (v_taylan, 'Premium Karışık Lokum 600 g', 'Lokum', 750, 'ADET', '["ADET"]'),
    (v_taylan, 'Dubai Çikolatalı Lokum 500 g', 'Lokum', 400, 'ADET', '["ADET"]'),
    (v_taylan, 'Dubai Çikolatalı Lokum 1 kg', 'Lokum', 800, 'KG', '["KG"]'),
    (v_taylan, 'Antep Fıstıklı Baklava Lokum 500 g', 'Lokum', 500, 'ADET', '["ADET"]'),
    (v_taylan, 'Antep Fıstıklı Baklava Lokum 1 kg', 'Lokum', 1000, 'KG', '["KG"]'),
    (v_taylan, 'İçi Dışı Bol Antep Fıstıklı Lokum 500 g', 'Lokum', 600, 'ADET', '["ADET"]'),
    (v_taylan, 'İçi Dışı Bol Antep Fıstıklı Lokum 1 kg', 'Lokum', 1200, 'KG', '["KG"]'),
    (v_taylan, 'Oreolu Lokum 500 g', 'Lokum', 350, 'ADET', '["ADET"]'),
    (v_taylan, 'Oreolu Lokum 1 kg', 'Lokum', 600, 'KG', '["KG"]'),
    (v_taylan, 'Çikolata Kaplı Antep Fıstıklı Çifte Kavrulmuş 500 g', 'Lokum', 375, 'ADET', '["ADET"]'),
    (v_taylan, 'Çikolata Kaplı Antep Fıstıklı Çifte Kavrulmuş 1 kg', 'Lokum', 750, 'KG', '["KG"]'),
    (v_taylan, 'Kaymaklı Lokum 500 g', 'Lokum', 300, 'ADET', '["ADET"]'),
    (v_taylan, 'Kaymaklı Lokum 1 kg', 'Lokum', 600, 'KG', '["KG"]'),
    (v_taylan, 'Sultan Kaymaklı Lokum 500 g', 'Lokum', 300, 'ADET', '["ADET"]'),
    (v_taylan, 'Sultan Kaymaklı Lokum 1 kg', 'Lokum', 600, 'KG', '["KG"]'),
    (v_taylan, 'Kaymaklı Antep Fıstıklı İçi Dışı Bol Lokum 500 g', 'Lokum', 500, 'ADET', '["ADET"]'),
    (v_taylan, 'Kaymaklı Antep Fıstıklı İçi Dışı Bol Lokum 1 kg', 'Lokum', 1000, 'KG', '["KG"]');

    raise notice 'Öz Taylan Yayla Lokum ürünleri eklendi';
  end if;
end $$;
