-- v1.4 AI Satış Motoru

-- Campaign types
create table if not exists sales_campaigns (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  name              text not null,
  type              text not null check (type in ('reorder', 'birthday', 'holiday', 'abandoned_cart', 'restock', 'price_drop', 'general')),
  trigger_days      integer, -- days since last order for reorder, days before birthday, etc
  message_template  text not null,
  active            boolean not null default false,
  send_whatsapp     boolean not null default true,
  send_email        boolean not null default false,
  product_id        uuid references products(id) on delete set null,
  discount_percent  numeric(5,2) default 0,
  min_order_amount  numeric(12,2) default 0,
  max_customers     integer default 0, -- 0 = unlimited
  last_run_at       timestamptz,
  created_at        timestamptz not null default now()
);

-- Scheduled campaign runs
create table if not exists campaign_logs (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  campaign_id       uuid references sales_campaigns(id) on delete cascade,
  customer_id       uuid references customers(id) on delete set null,
  type              text not null,
  status            text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'opted_out')),
  message           text,
  sent_at           timestamptz,
  created_at        timestamptz not null default now()
);

-- Add automation settings to tenant_settings
alter table tenant_settings add column if not exists sales_automation_enabled boolean not null default false;
alter table tenant_settings add column if not exists reorder_reminder_days integer not null default 30;
alter table tenant_settings add column if not exists birthday_reminder_enabled boolean not null default false;
alter table tenant_settings add column if not exists holiday_campaigns_enabled boolean not null default false;
alter table tenant_settings add column if not exists abandoned_cart_enabled boolean not null default false;
alter table tenant_settings add column if not exists abandoned_cart_hours integer not null default 24;
