-- ============================================================
-- SiparişAsistanı - Faz 1: Kargo Entegrasyonları
-- 6 firma (Yurtiçi, Aras, MNG, DHL, Sürat, PTT) için firmaya özel kimlikler
-- + siparişlerde kargo durumu takibi
-- ============================================================

-- 1) cargo_integrations - her kargo firması için ayrı kimlik/anahtar
create table if not exists cargo_integrations (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  company      text not null,            -- yurtici | aras | mng | dhl | surat | ptt
  enabled      boolean not null default false,
  api_key      text,
  api_secret   text,
  extra_config jsonb not null default '{}', -- firma özel alanlar (kullanıcı kodu, şube, müşteri no...)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (tenant_id, company)
);

create index if not exists idx_cargo_integrations_tenant on cargo_integrations(tenant_id);

-- 2) orders - kargo durumu takip kolonları
-- cargo_status: pending | in_transit | out_for_delivery | delivered | failed | unknown
alter table orders add column if not exists cargo_status text;
alter table orders add column if not exists cargo_status_updated_at timestamptz;

-- 3) RLS + policy'ler
alter table cargo_integrations enable row level security;

drop policy if exists tenant_isolation_cargo_integrations on cargo_integrations;
create policy tenant_isolation_cargo_integrations on cargo_integrations
  for all using (tenant_id = auth.uid()::uuid);