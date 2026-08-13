-- ============================================================
-- Test Verisi Reset: order_id FK + demo veriler + test görüşmeleri
-- Supabase SQL Editor'da TEK SEFERDE çalıştır
-- ============================================================

-- 1. order_id FK kolonunu ekle (yoksa)
alter table conversation_sessions
  add column if not exists order_id uuid references orders(id) on delete set null;

create index if not exists idx_conv_sessions_order on conversation_sessions(order_id);

-- 2. Demo verileri sıfırla (020_demo_seed ile aynı mantık, kısaltılmış)
do $$
declare
  v_tid uuid := '00000000-0000-0000-0000-000000000001';
  v_product_names text[] := array['Dana Parmak Sucuk','Acılı Parmak Sucuk','Kangal Sucuk','Pastırma','Kavurma','Tulum Peyniri','Afyon Kaymak'];
  v_product_prices numeric[] := array[890,920,750,1200,650,380,450];
  v_customer_names text[] := array['Mehmet Yılmaz','Ayşe Demir','Ali Kaya','Fatma Şahin','Mustafa Öztürk','Zeynep Arslan','İbrahim Yıldız','Hatice Çelik','Ahmet Kurt','Elif Koç'];
  v_customer_phones text[] := array['05321234567','05339876543','05411223344','05449876543','05551234567','05328765432','05438765432','05559876543','05321239876','05411239876'];
  v_customer_id uuid;
  v_order_id uuid;
  v_session_id uuid;
  v_date timestamptz;
  v_status text;
  v_source text;
  v_channel text;
  i int; j int; seq int := 0;
begin
  -- Temizlik
  delete from order_items where order_id in (select id from orders where tenant_id = v_tid);
  delete from activity_logs where tenant_id = v_tid and entity_type = 'order';
  delete from conversation_sessions where tenant_id = v_tid;
  delete from orders where tenant_id = v_tid;
  delete from customers where tenant_id = v_tid;
  delete from products where tenant_id = v_tid;
  delete from users where tenant_id = v_tid;

  -- Tenant yoksa oluştur
  insert into tenants (id, company_name, domain, phone, email, iban, address, city, tax_number)
  values (v_tid, 'Demo İşletme', 'demo', '05320000000', 'demo@demo.com',
    'TR12 0001 2345 6789 0001 2345 67', 'Atatürk Cad. No:42', 'Afyonkarahisar', '1234567890')
  on conflict (id) do nothing;

  -- Settings
  insert into tenant_settings (tenant_id, voice_gender, brand_voice, greeting_style, ai_style,
    iban_enabled, human_transfer_enabled, callback_enabled, record_calls, business_hours_enabled,
    business_hours_start, business_hours_end, cash_on_delivery_enabled)
  values (v_tid, 'female', 'yoresel', 'firma_ad', 'yoresel',
    true, true, true, true, false, '08:00', '18:30', true)
  on conflict (tenant_id) do update set cash_on_delivery_enabled = true;

  -- Demo kullanıcı
  insert into users (tenant_id, name, email, phone, password, role, active)
  values (v_tid, 'Demo Owner', 'demo@siparisasistani.com', '05320000000',
    'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'owner', true);

  -- Ürünler
  for i in 1..array_length(v_product_names, 1) loop
    insert into products (tenant_id, product_name, category, price, unit, sale_types)
    values (v_tid, v_product_names[i], 'Kasap Ürünleri', v_product_prices[i], 'KG',
      (case when v_product_names[i] like '%Sucuk%' then '["KG","SAP"]' else '["KG"]' end)::jsonb)
    on conflict do nothing;
  end loop;

  -- Müşteriler ve Siparişler
  for i in 1..20 loop
    v_customer_id := gen_random_uuid();
    insert into customers (id, tenant_id, name, phone, city)
    values (v_customer_id, v_tid,
      v_customer_names[1 + (i % 10)],
      v_customer_phones[1 + (i % 10)],
      case when i % 3 = 0 then 'İstanbul' when i % 3 = 1 then 'Ankara' else 'Afyonkarahisar' end);

    for j in 1..5 loop
      v_date := now() - ((i * 5 + j) * interval '1 hour');
      v_channel := case when j % 3 = 0 then 'whatsapp' else 'phone' end;
      v_source := case when v_channel = 'whatsapp' then 'WHATSAPP' else 'PHONE' end;
      v_status := case when j % 5 < 3 then 'DELIVERED' when j % 5 < 4 then 'shipped' else 'new' end;

      seq := seq + 1;
      v_order_id := gen_random_uuid();
      insert into orders (id, tenant_id, customer_id, order_number, channel, source, status,
        payment_method, payment_status, total_price, created_at, updated_at)
      values (v_order_id, v_tid, v_customer_id,
        '25-' || lpad(seq::text, 5, '0'),
        v_channel::order_channel, v_source, v_status::order_status, 'iban'::payment_method,
        (case when v_status in ('DELIVERED','shipped') then 'paid' else 'waiting' end)::payment_status,
        v_product_prices[1 + (j % 7)] * (1 + (j % 3)),
        v_date, v_date);

      insert into order_items (order_id, product_id, product_name, quantity, unit, unit_price, total)
      values (v_order_id,
        (select id from products where tenant_id = v_tid order by random() limit 1),
        v_product_names[1 + ((j + i) % 7)], 1 + (j % 5), 'KG',
        v_product_prices[1 + ((j + i) % 7)],
        v_product_prices[1 + ((j + i) % 7)] * (1 + (j % 3)));

      insert into activity_logs (tenant_id, entity_type, entity_id, event_type, description, channel, event_icon, actor_type, created_at)
      values (v_tid, 'order', v_order_id, 'ORDER_CREATED',
        'AI, ' || case when v_channel = 'whatsapp' then 'WhatsApp' else 'Telefon' end ||
        ' üzerinden ' || v_customer_names[1 + (i % 10)] || ' adına sipariş oluşturdu.',
        v_channel, '🛒', 'AI', v_date);
    end loop;
  end loop;

  -- Kampanya
  insert into campaigns (tenant_id, title, description, condition, offer, min_quantity, target_product, start_date, end_date, active)
  values (v_tid, 'Yaz Kampanyası', '3 KG ve üzeri sucuk alımlarında 500 gr kavurma hediye',
    '3 KG ve üzeri sucuk alımında', '500 gr Kavurma Hediye', 3, 'Sucuk',
    '2026-01-01', '2026-12-31', true)
  on conflict do nothing;

  -- 5 test şikayeti
  for i in 1..5 loop
    insert into activity_logs (tenant_id, entity_type, event_type, description, channel, event_icon, actor_type, metadata, created_at)
    values (v_tid, 'complaint', 'COMPLAINT_OPEN',
      '⚠️ AI, ' || v_customer_names[1 + (i % 10)] || ' için şikayet kaydı oluşturdu.',
      'VOICE', '⚠️', 'AI',
      jsonb_build_object('type', 'WRONG_PRODUCT', 'severity', 'HIGH', 'ticket_number', 'DEMO-' || lpad(i::text, 4, '0')),
      now() - (i * 2 * interval '1 day'))
    on conflict do nothing;
  end loop;

  -- Test Görüşmeleri (ilk 10 siparişe bağlı conversation_sessions)
  for j in 1..10 loop
    v_order_id := (select id from orders where tenant_id = v_tid order by created_at offset j-1 limit 1);
    v_customer_id := (select customer_id from orders where id = v_order_id);

    v_session_id := gen_random_uuid();
    insert into conversation_sessions (
      id, tenant_id, channel, phone, status, call_status, session_label,
      messages, session_data, order_id, created_at, ended_at, call_duration,
      call_recording_url, ai_model
    ) values (
      v_session_id, v_tid, case when j % 3 = 0 then 'whatsapp' else 'phone' end,
      '05321234567', 'completed', 'COMPLETED',
      'SESSION-20260813-' || lpad(j::text, 4, '0'),
      jsonb_build_array(
        jsonb_build_object('role', 'user', 'content', 'Merhaba, ' || (select product_name from order_items where order_id = v_order_id limit 1) || ' almak istiyorum.'),
        jsonb_build_object('role', 'assistant', 'content', 'Merhaba, Demo Isletmeye hos geldiniz. Adinizi ogrenebilir miyim?'),
        jsonb_build_object('role', 'user', 'content', (select name from customers where id = v_customer_id)),
        jsonb_build_object('role', 'assistant', 'content', 'Memnun oldum. ' || (select product_name from order_items where order_id = v_order_id limit 1) || ' not ettim. Baska bir urun var mi?'),
        jsonb_build_object('role', 'user', 'content', 'Hayir tesekkurler. Adresim Ankara Cankaya. IBAN ile odeyecegim.'),
        jsonb_build_object('role', 'assistant', 'content', 'Anladim, siparisiniz olusturuldu. Tesekkur ederim.')
      ),
      jsonb_build_object(
        'summary', (select name from customers where id = v_customer_id) || ' test görüşmesi - sipariş tamamlandı',
        'sentiment', case when j % 3 = 0 then 'NEUTRAL' else 'HAPPY' end,
        'sentiment_score', 70 + (j % 30),
        'products', array[(select product_name from order_items where order_id = v_order_id limit 1)],
        'payment_method', 'IBAN',
        'address', 'Ankara/Çankaya',
        'customer_name', (select name from customers where id = v_customer_id),
        'ai_errors', '[]'::jsonb,
        'duration_seconds', 120 + j * 15,
        'needs_human', false
      ),
      v_order_id,
      now() - (j * interval '2 hours'),
      now() - (j * interval '2 hours') + (2 + j % 3) * interval '1 minute',
      120 + j * 15,
      case when j = 3 then 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' else null end,
      'deepseek-chat'
    );
  end loop;

  -- 3 siparişsiz görüşme (order_id = null)
  for i in 1..3 loop
    v_session_id := gen_random_uuid();
    insert into conversation_sessions (
      id, tenant_id, channel, phone, status, call_status, session_label,
      messages, session_data, order_id, created_at, ended_at, call_duration
    ) values (
      v_session_id, v_tid, 'phone', '05321234567', 
      case when i = 1 then 'completed' when i = 2 then 'failed' else 'completed' end,
      case when i = 1 then 'COMPLETED' when i = 2 then 'FAILED' else 'COMPLETED' end,
      'SESSION-20260813-NO' || i,
      jsonb_build_array(
        jsonb_build_object('role', 'user', 'content', 'Merhaba fiyat alabilir miyim?'),
        jsonb_build_object('role', 'assistant', 'content', 'Tabii, hangi urunle ilgileniyorsunuz?'),
        jsonb_build_object('role', 'user', 'content', 'Sucuk fiyati nedir?'),
        jsonb_build_object('role', 'assistant', 'content', 'Kangal Sucuk 750 TL/kg, Dana Parmak Sucuk 890 TL/kg.'),
        jsonb_build_object('role', 'user', 'content', 'Tesekkurler dusuneyim.')
      ),
      jsonb_build_object(
        'summary', 'Test görüşmesi #' || i || ' - sadece fiyat sormuş, siparişe dönüşmemiş',
        'sentiment', 'NEUTRAL',
        'sentiment_score', 60,
        'products', '[]'::jsonb,
        'payment_method', 'BELIRSIZ',
        'address', '',
        'customer_name', 'Fiyat Soran Müşteri #' || i,
        'ai_errors', '[]'::jsonb,
        'duration_seconds', 45,
        'needs_human', false
      ),
      null,
      now() - (i * interval '3 hours'),
      now() - (i * interval '3 hours') + interval '45 seconds',
      45
    );
  end loop;

end $$;
