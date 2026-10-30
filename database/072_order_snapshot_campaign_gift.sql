-- 072: Sipariş müşteri snapshot + kampanya hediye (yapılandırılmış)
-- 1) Sipariş anındaki müşteri adı/telefonu (aynı telefonla test/çoklu aramada isim karışmasın)
alter table orders add column if not exists customer_name text;
alter table orders add column if not exists customer_phone text;

-- 2) Kampanya hediye ürünü (0 TL kalem olarak siparişe eklenir)
alter table campaigns add column if not exists gift_product text;
alter table campaigns add column if not exists gift_quantity numeric;
alter table campaigns add column if not exists gift_unit text;

-- Mevcut "hediye" kampanyalarını offer metninden doldur (basit sezgisel; panelden düzeltilebilir)
update campaigns set gift_product = 'Kavurma', gift_quantity = 0.5, gift_unit = 'KG'
 where gift_product is null and lower(offer) like '%kavurma%hediye%';
update campaigns set gift_product = 'Dana Jambon', gift_quantity = 1, gift_unit = 'KG'
 where gift_product is null and lower(offer) like '%jambon%hediye%';
update campaigns set gift_product = 'Sosis', gift_quantity = 1, gift_unit = 'KG'
 where gift_product is null and lower(offer) like '%sosis%hediye%';

-- 3) Eski siparişlere mevcut müşteri adı/telefonunu geriye dönük yaz
update orders o set customer_name = c.name, customer_phone = c.phone
 from customers c
 where o.customer_id = c.id and o.customer_name is null;

-- 4) Ses kaydi saklama: 15 gun + otomatik temizlik
update tenant_settings set recording_retention_days = 15, auto_cleanup_enabled = true where recording_retention_days is null or recording_retention_days > 15;
