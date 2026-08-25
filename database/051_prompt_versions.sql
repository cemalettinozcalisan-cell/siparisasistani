-- ============================================================
-- SiparişAsistanı - Faz 3: Prompt Sürümleme & Onay Kapısı (3B)
-- Bir prompt değişikliği 100 esnaf x binlerce görüşmeyi etkiler.
-- "kaydet -> canlıya al" riskli olduğundan sürüm + onay akışı kurar:
--   DRAFT -> TESTING -> APPROVED -> ACTIVE
-- ============================================================

create table if not exists prompt_versions (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  channel      text not null,             -- phone | whatsapp | instagram | sms
  state        text not null,             -- GREETING | ORDERING | ... (durum)
  version      integer not null default 1,
  prompt       text not null,
  status       text not null default 'draft', -- draft | testing | approved | active
  tested_at    timestamptz,
  test_result  text,                      -- otomatik senaryo testi sonucu
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (tenant_id, channel, state, version)
);

create index if not exists idx_prompt_versions_tenant on prompt_versions(tenant_id, channel, state, version desc);

alter table prompt_versions enable row level security;

drop policy if exists tenant_isolation_prompt_versions on prompt_versions;
create policy tenant_isolation_prompt_versions on prompt_versions
  for all using (tenant_id = auth.uid()::uuid);
