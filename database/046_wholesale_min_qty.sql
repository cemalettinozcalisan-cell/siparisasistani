-- ============================================================
-- SiparişAsistanı - Toptan Min. Miktar
-- Esnaf ürünlere toptan fiyatın yanına minimum toptan miktar girer.
-- AI, miktar bu değerden küçükse toptan fiyatı uygulamaz (normal fiyatı kullanır).
-- ============================================================
alter table products add column if not exists wholesale_min_qty numeric default 0;
