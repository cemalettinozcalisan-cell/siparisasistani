-- 070: Karşılama ürün alanı (greeting_product)
-- Açılış karşılama şablonundaki {urun} değişkeni için işletmeye özel ürün adı.
alter table tenant_settings add column if not exists greeting_product text;
