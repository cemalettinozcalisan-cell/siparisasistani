-- ============================================================
-- SiparişAsistanı - SaaS Management (Abonelik & Faturalandırma)
-- ============================================================

-- Subscription plans
create table if not exists subscription_plans (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,
  description text,
  price_monthly numeric(10,2) not null,
  order_limit integer not null,
  features    jsonb,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Add-on packs
create table if not exists addon_packs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,
  order_credit integer not null,
  price       numeric(10,2) not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Tenant subscriptions
create table if not exists subscriptions (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  plan_id           uuid references subscription_plans(id),
  status            text not null default 'active' check (status in ('active', 'past_due', 'cancelled', 'expired')),
  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz not null,
  order_limit       integer not null,
  orders_used       integer not null default 0,
  auto_renew        boolean not null default true,
  auto_topup        boolean not null default false,
  topup_pack_id     uuid references addon_packs(id),
  payment_token     text,
  payment_provider  text,
  grace_period_end  timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_subscriptions_tenant on subscriptions(tenant_id);
create index idx_subscriptions_status on subscriptions(status);

-- Invoices
create table if not exists invoices (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  subscription_id uuid references subscriptions(id),
  invoice_number  text not null,
  description     text,
  amount          numeric(10,2) not null,
  currency        text not null default 'TRY',
  status          text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  payment_method  text,
  payment_date    timestamptz,
  invoice_pdf_url text,
  created_at      timestamptz not null default now()
);

create index idx_invoices_tenant on invoices(tenant_id);
create index idx_invoices_subscription on invoices(subscription_id);

-- Default plans
insert into subscription_plans (name, code, description, price_monthly, order_limit, features, sort_order) values
  ('Starter', 'starter', 'Kucuk isletmeler icin temel paket', 299, 250, '["AI Siparis Alma", "WhatsApp Entegrasyonu", "Panel", "E-posta Destek"]', 1),
  ('Professional', 'professional', 'Buyuyen isletmeler icin profesyonel paket', 599, 500, '["AI Siparis Alma", "WhatsApp Entegrasyonu", "Panel", "CRM", "Raporlar", "Oncelikli Destek"]', 2),
  ('Business', 'business', 'Yogun satis yapan isletmeler icin', 999, 1000, '["AI Siparis Alma", "WhatsApp Entegrasyonu", "Panel", "CRM", "Raporlar", "Kampanyalar", "7/24 Destek"]', 3)
on conflict (code) do nothing;

-- Default add-on packs
insert into addon_packs (name, code, order_credit, price) values
  ('+100 Siparis', 'extra-100', 100, 99),
  ('+250 Siparis', 'extra-250', 250, 199),
  ('+500 Siparis', 'extra-500', 500, 349)
on conflict (code) do nothing;

alter table subscriptions enable row level security;
alter table invoices enable row level security;

create policy tenant_isolation_subscriptions on subscriptions
  for all using (tenant_id = auth.uid()::uuid);
create policy tenant_isolation_invoices on invoices
  for all using (tenant_id = auth.uid()::uuid);
