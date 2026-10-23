-- 069: Aydınlatma metni (IVR'de "2"ye basınca dinlenir) — esnaf panelden yazar.
-- Supabase SQL Editor'da çalıştırın. Idempotent.
alter table tenant_settings add column if not exists kvkk_disclosure_text text;
