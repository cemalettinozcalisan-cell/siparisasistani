-- ============================================================
-- SiparişAsistanı - Product Engine Pro (Esnaf Geri Bildirimi)
-- ============================================================

-- 1) Products tablosuna yeni alanlar
alter table products add column if not exists sale_types jsonb not null default '["KG"]'::jsonb;
alter table products add column if not exists variable_weight boolean not null default false;
alter table products add column if not exists avg_weight_gr numeric(6,1);
alter table products add column if not exists min_weight_gr numeric(6,1);
alter table products add column if not exists max_weight_gr numeric(6,1);
alter table products add column if not exists ai_rules text;
alter table products add column if not exists category_sale_type text;

-- 2) Kampanya tablosu
create table if not exists campaigns (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  title         text not null,
  description   text,
  condition     text not null,
  offer         text not null,
  min_amount    numeric(12,2),
  min_quantity  numeric(12,3),
  target_product text,
  start_date    date,
  end_date      date,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index idx_campaigns_tenant on campaigns(tenant_id);
create index idx_campaigns_active on campaigns(tenant_id, active) where active = true;

alter table campaigns enable row level security;
create policy tenant_isolation_campaigns on campaigns
  for all using (tenant_id = auth.uid()::uuid);
