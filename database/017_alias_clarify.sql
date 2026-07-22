-- ============================================================
-- SiparişAsistanı - Alias Engine + Clarification
-- ============================================================

-- Product aliases (ürün eş anlamlıları)
create table if not exists product_aliases (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  alias       text not null,
  created_at  timestamptz not null default now()
);

create index idx_product_aliases_tenant on product_aliases(tenant_id);
create index idx_product_aliases_alias on product_aliases(tenant_id, alias);
create unique index idx_product_aliases_unique on product_aliases(tenant_id, alias);

-- Campaign-target product relationship
alter table campaigns add column if not exists target_product_id uuid references products(id) on delete set null;

alter table product_aliases enable row level security;
create policy tenant_isolation_product_aliases on product_aliases
  for all using (tenant_id = auth.uid()::uuid);
