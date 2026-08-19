-- ============================================================
-- SiparişAsistanı - Kargo Son Rötuş: Varsayılan Kargo Firması
-- Esnaf kargo firmasını bir kez seçer (Varsayılan Yap), sonraki
-- tüm "Kargoya Ver" işlemleri varsayılan firmayı otomatik kullanır.
-- ============================================================

-- 1) tenant_settings - varsayılan kargo firması
alter table tenant_settings add column if not exists default_cargo_company text;

-- 2) RLS: tenant_settings zaten izole (mevcut policy). Yeni kolon
--    aynı satırda olduğundan ek policy gerekmez.