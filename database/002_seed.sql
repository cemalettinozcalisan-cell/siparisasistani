-- ============================================================
-- SiparişAsistanı - Seed Data (Demo)
-- ============================================================

-- Örnek Tenant: Ahmet İpek Sucukları
insert into tenants (id, company_name, domain, phone, email, iban, address, city, tax_number)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Ahmet İpek Sucukları',
  'ahmetipek',
  '05321234567',
  'info@ahmetipek.com',
  'TR12 0001 2345 6789 0001 2345 67',
  'Küçük Sanayi Sitesi No:42',
  'Afyonkarahisar',
  '1234567890'
);

-- Örnek Kullanıcı (Patron)
insert into users (id, tenant_id, name, email, phone, password, role)
values (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Ahmet İpek',
  'ahmet@ahmetipek.com',
  '05321234567',
  '$2a$10$placeholder_hash', -- gerçek hash ile değiştirilmeli
  'owner'
);

-- Örnek Ürünler (Ahmet İpek Sucukları - gerçek et ürünleri)
insert into products (id, tenant_id, product_name, category, price, unit) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Dana Parmak Sucuk', 'Sucuk', 890, 'KG'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Acılı Parmak Sucuk', 'Sucuk', 920, 'KG'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Kangal Sucuk', 'Sucuk', 750, 'KG'),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Kavurma', 'Kavurma', 650, 'KG'),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Pastırma', 'Pastırma', 1200, 'KG'),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Tulum Peyniri', 'Peynir', 380, 'KG'),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Afyon Kaymak', 'Kaymak', 450, 'KG');

-- Örnek Müşteri
insert into customers (id, tenant_id, name, phone, email, address, city, identity_number)
values (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Mehmet Yılmaz',
  '05339876543',
  'mehmet@example.com',
  'Çankaya Mah. No:10',
  'Ankara',
  '12345678901'
);

-- Örnek Sipariş (3 KG Dana Parmak Sucuk + 1 KG Pastırma)
insert into orders (id, tenant_id, customer_id, order_number, channel, status, payment_method, payment_status, total_price)
values (
  'e0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  '25-00001',
  'phone',
  'new',
  'iban',
  'waiting',
  3870
);

-- Örnek Sipariş Kalemleri
insert into order_items (order_id, product_id, product_name, quantity, unit, unit_price, total) values
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Dana Parmak Sucuk', 3, 'KG', 890, 2670),
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'Pastırma', 1, 'KG', 1200, 1200);
