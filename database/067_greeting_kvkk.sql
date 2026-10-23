-- 067: FAZ 0 — Karşılama şablonu + AI asistan adı + KVKK linki (tenant bazlı)
-- Supabase SQL Editor'da çalıştırın. Idempotent.
alter table tenant_settings add column if not exists greeting_template text;
alter table tenant_settings add column if not exists ai_assistant_name text default 'Bilge';
alter table tenant_settings add column if not exists kvkk_url text;

update tenant_settings set ai_assistant_name = 'Bilge' where ai_assistant_name is null;
