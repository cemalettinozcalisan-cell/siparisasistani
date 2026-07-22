-- ============================================================
-- SiparişAsistanı - Demo Tenant Seed (Kapsamlı)
-- ============================================================

do $$
declare
  v_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
  v_customer_id uuid;
  v_order_id uuid;
  v_date timestamptz;
  v_status order_status;
  v_source text;
  v_channel order_channel;
  v_product_ids uuid[];
  v_product_names text[] := array['Dana Parmak Sucuk','Acılı Parmak Sucuk','Kangal Sucuk','Pastırma','Kavurma','Tulum Peyniri','Afyon Kaymak'];
  v_product_prices numeric[] := array[890,920,750,1200,650,380,450];
  v_customer_names text[] := array['Mehmet Yılmaz','Ayşe Demir','Ali Kaya','Fatma Şahin','Mustafa Öztürk','Zeynep Arslan','İbrahim Yıldız','Hatice Çelik','Ahmet Kurt','Elif Koç'];
  v_customer_phones text[] := array['05321234567','05339876543','05411223344','05449876543','05551234567','05328765432','05438765432','05559876543','05321239876','05411239876'];
  i int; j int; k int; seq int := 0;
begin
  -- Tenant
  insert into tenants (id, company_name, domain, phone, email, iban, address, city, tax_number)
  values (v_tenant_id, 'Demo İşletme', 'demo', '05320000000', 'demo@demo.com',
    'TR12 0001 2345 6789 0001 2345 67', 'Atatürk Cad. No:42', 'Afyonkarahisar', '1234567890')
  on conflict (id) do nothing;

  -- Settings
  insert into tenant_settings (tenant_id, voice_gender, brand_voice, greeting_style, ai_style,
    iban_enabled, human_transfer_enabled, callback_enabled, record_calls, business_hours_enabled,
    business_hours_start, business_hours_end)
  values (v_tenant_id, 'female', 'yoresel', 'firma_ad', 'yoresel',
    true, true, true, true, true, '08:00', '18:30')
  on conflict (tenant_id) do nothing;

  -- Ürünler
  for i in 1..array_length(v_product_names, 1) loop
    insert into products (tenant_id, product_name, category, price, unit, sale_types)
    values (v_tenant_id, v_product_names[i], 'Kasap Ürünleri', v_product_prices[i], 'KG',
      (case when v_product_names[i] like '%Sucuk%' then '["KG","SAP"]' else '["KG"]' end)::jsonb)
    on conflict do nothing;
  end loop;

  -- Müşteriler (20 adet)
  for i in 1..20 loop
    v_customer_id := gen_random_uuid();
    insert into customers (id, tenant_id, name, phone, city)
    values (v_customer_id, v_tenant_id,
      v_customer_names[1 + (i % 10)],
      v_customer_phones[1 + (i % 10)],
      case when i % 3 = 0 then 'İstanbul' when i % 3 = 1 then 'Ankara' else 'Afyonkarahisar' end)
    on conflict (id) do nothing;

    -- Siparişler (50 adet = 20*50 = 1000 toplam)
    for j in 1..50 loop
      v_date := now() - ((i * 5 + j) * interval '1 hour');
      v_status := case when j % 10 < 6 then 'DELIVERED'::order_status when j % 10 < 8 then 'shipped'::order_status when j % 10 < 9 then 'PACKAGING'::order_status else 'PAYMENT_CONFIRMED'::order_status end;
      v_channel := case when j % 3 = 0 then 'whatsapp'::order_channel else 'phone'::order_channel end;
      v_source := case when v_channel = 'whatsapp'::order_channel then 'WHATSAPP'::text else 'PHONE'::text end;

      seq := seq + 1;
      v_order_id := gen_random_uuid();
      insert into orders (id, tenant_id, customer_id, order_number, channel, source, status,
        payment_method, payment_status, total_price, created_at, updated_at)
      values (v_order_id, v_tenant_id, v_customer_id,
        '25-' || lpad(seq::text, 5, '0'),
        v_channel, v_source,
        v_status, 'iban'::payment_method,
        case when v_status in ('DELIVERED'::order_status, 'shipped'::order_status, 'completed'::order_status) then 'paid'::payment_status else 'waiting'::payment_status end,
        v_product_prices[1 + (j % 7)] * (1 + (j % 3)),
        v_date, v_date)
      on conflict (id) do nothing;

      -- Order items
      for k in 1..(1 + (j % 3)) loop
        insert into order_items (order_id, product_id, product_name, quantity, unit, unit_price, total)
        values (v_order_id,
          (select id from products where tenant_id = v_tenant_id order by random() limit 1),
          v_product_names[1 + ((j + k) % 7)], 1 + (j % 5), 'KG',
          v_product_prices[1 + ((j + k) % 7)],
          v_product_prices[1 + ((j + k) % 7)] * (1 + (j % 3)))
        on conflict do nothing;
      end loop;

      -- Activity logs (timeline)
      insert into activity_logs (tenant_id, entity_type, entity_id, event_type, description, channel, event_icon, actor_type, created_at)
      values (v_tenant_id, 'order', v_order_id, 'ORDER_CREATED',
        'AI, ' || case when v_channel = 'whatsapp'::order_channel then 'WhatsApp' else 'Telefon' end ||
        ' üzerinden ' || v_customer_names[1 + (i % 10)] || ' adına sipariş oluşturdu.',
        case when v_channel = 'whatsapp'::order_channel then 'WHATSAPP' else 'VOICE' end, '🛒', 'AI', v_date)
      on conflict do nothing;
    end loop;
  end loop;

  -- Kampanya
  insert into campaigns (tenant_id, title, description, condition, offer, min_quantity, target_product, start_date, end_date, active)
  values (v_tenant_id, 'Yaz Kampanyası', '3 KG ve üzeri sucuk alımlarında 500 gr kavurma hediye',
    '3 KG ve üzeri sucuk alımında', '500 gr Kavurma Hediye', 3, 'Sucuk',
    '2026-01-01', '2026-12-31', true)
  on conflict do nothing;

  -- Şikayetler
  for i in 1..5 loop
    insert into activity_logs (tenant_id, entity_type, event_type, description, channel, event_icon, actor_type, metadata, created_at)
    values (v_tenant_id, 'complaint', 'COMPLAINT_OPEN',
      '⚠️ AI, ' || v_customer_names[1 + (i % 10)] || ' için şikayet kaydı oluşturdu.',
      'VOICE', '⚠️', 'AI',
      jsonb_build_object('type', 'WRONG_PRODUCT', 'severity', 'HIGH', 'ticket_number', 'DEMO-' || lpad(i::text, 4, '0')),
      now() - (i * 2 * interval '1 day'))
    on conflict do nothing;
  end loop;
end $$;
