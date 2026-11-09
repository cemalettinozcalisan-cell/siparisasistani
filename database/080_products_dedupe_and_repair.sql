-- 080: Mükerrer ürün temizliği + 26-00213 onarımı + il/ilçe backfill
-- Kanonik ürünler:
--   Bademli Lokum: d064e9cc-470d-4112-b0a8-e0c229cc1ea2 (400)
--   Keçi Sucuk:    4c186a70-0728-4898-a841-ac5725840f4d (1.200)
--   Manda Sucuk:   b326eccb-953f-4c68-8204-39ae6d166fef (1.600)
--   Kuzu Sucuk:    1dfd405d-b56a-44f5-a955-4cbdb8cd5a17 (1.200)
-- Supabase SQL Editor'de çalıştırın.

BEGIN;

-- 1) Eski sipariş kalemlerinin ürün referanslarını kanonik kayda taşı (fiyat/toplam tarihsel kalır)
UPDATE order_items SET product_id = 'd064e9cc-470d-4112-b0a8-e0c229cc1ea2'
WHERE product_id IN ('5de83edd-7134-4e97-bc0f-8fea65da8102', '7b6d1ce4-b9a6-4b21-929e-b4c74826a97e');

UPDATE order_items SET product_id = '1dfd405d-b56a-44f5-a955-4cbdb8cd5a17'
WHERE product_id IN ('fe8437df-2dd1-4012-a67b-fb6618f42b59');

UPDATE order_items SET product_id = '4c186a70-0728-4898-a841-ac5725840f4d'
WHERE product_id IN ('bdae203b-3d9f-40b6-9730-dcc1544f2518', '0780bfb6-9281-4e12-ba4d-43bdbae98cd1');

UPDATE order_items SET product_id = 'b326eccb-953f-4c68-8204-39ae6d166fef'
WHERE product_id IN ('0121084d-7a63-4e52-97cc-780e77200233');

-- 2) 26-00213 onarımı (Manda 3 x 1.600 + Keçi 1 x 1.200 = 6.000; Kavurma hediye 0)
UPDATE order_items SET product_id = 'b326eccb-953f-4c68-8204-39ae6d166fef', unit_price = 1600, total = 4800
WHERE id = 'fc13dc67-2b8b-4d1b-b41d-21055bfc6231';
UPDATE order_items SET product_id = '4c186a70-0728-4898-a841-ac5725840f4d', unit_price = 1200, total = 1200
WHERE id = 'be1cc089-eeff-4830-9d51-971f5d7b669e';
UPDATE order_items SET product_id = 'b45b1eb1-c781-4694-afc5-d63a21851fc8', unit_price = 0, total = 0
WHERE id = 'dc55a90d-8416-475e-a41e-32c178314eb7';

UPDATE orders
SET total_price = 6000, customer_city = 'İstanbul', customer_district = 'Bakırköy'
WHERE id = '54e4856c-7619-475c-9a1e-41ab4904fdcd';

-- 3) Mevcut WhatsApp siparişlerinde il/ilçe backfill
UPDATE orders SET customer_city = 'İstanbul', customer_district = 'Fatih'
WHERE id = '98ec3a8b-c093-41d1-8fba-11a06ed4d476';
UPDATE orders SET customer_city = 'İstanbul', customer_district = 'Zeytinburnu'
WHERE id = 'f660b8f4-d997-4a25-a1be-0c77db52f2bd';
UPDATE orders SET customer_city = 'Ankara', customer_district = 'Merkez'
WHERE id = '351d5b48-a856-4726-8c2d-bb8cdafe57d6';
UPDATE orders SET customer_city = 'Şanlıurfa', customer_district = 'Merkez'
WHERE id = 'b5f9fa5a-4f48-49dc-9313-37dd986edca1';
UPDATE orders SET customer_city = 'Antalya', customer_district = 'Konyaaltı'
WHERE id = '39838f0e-9755-4b71-99b5-e7d83ddb0438';
UPDATE orders SET customer_city = 'Konya', customer_district = 'Merkez'
WHERE id = '775b1af0-090e-4293-8726-7a0a55def6cc';
UPDATE orders SET customer_city = 'Hatay', customer_district = 'İskenderun'
WHERE id = '0f552f46-936a-499c-8543-754d2dcaa3c1';

-- 4) Mükerrer ürünleri sil
DELETE FROM products
WHERE id IN (
  '5de83edd-7134-4e97-bc0f-8fea65da8102',
  '7b6d1ce4-b9a6-4b21-929e-b4c74826a97e',
  'bdae203b-3d9f-40b6-9730-dcc1544f2518',
  '0780bfb6-9281-4e12-ba4d-43bdbae98cd1',
  '0121084d-7a63-4e52-97cc-780e77200233',
  'fe8437df-2dd1-4012-a67b-fb6618f42b59'
);

-- 5) Aynı isimde ikinci ürün oluşmasını engelle
CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_name_uidx
  ON products (tenant_id, lower(product_name));

COMMIT;
