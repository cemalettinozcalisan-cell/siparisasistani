
-- ============================================================
-- 2. TABLOLAR
-- ============================================================

-- 2.1) tenants
create table tenants (
  id          uuid primary key default gen_random_uuid(),
  company_name text not null,
  domain      text unique,
  phone       text,
  email       text,
  iban        text,
  address     text,
  city        text,
  tax_number  text,
  logo_url    text,
  status      text not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2.2) users
create table users (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  email      text not null,
  phone      text,
  password   text not null,
  role       user_role not null default 'employee',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index idx_users_tenant_email on users(tenant_id, email);

-- 2.3) products
create table products (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  product_name text not null,
  category     text,
  price        numeric(12,2) not null,
  unit         text not null default 'KG',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_products_tenant on products(tenant_id);

-- 2.4) customers
create table customers (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  name             text not null,
  phone            text,
  email            text,
  address          text,
  city             text,
  note             text,
  identity_number  text,
  created_at       timestamptz not null default now()
);

create index idx_customers_tenant on customers(tenant_id);
create index idx_customers_phone on customers(tenant_id, phone);

-- 2.5) orders
create table orders (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  customer_id     uuid references customers(id) on delete set null,
  order_number    text not null,
  channel         order_channel not null default 'phone',
  status          order_status not null default 'new',
  payment_method  payment_method,
  payment_status  payment_status not null default 'waiting',
  total_price     numeric(12,2) not null default 0,
  cargo_company   text,
  tracking_number text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index idx_orders_number_tenant on orders(tenant_id, order_number);
create index idx_orders_tenant on orders(tenant_id);
create index idx_orders_customer on orders(customer_id);
create index idx_orders_status on orders(tenant_id, status);

-- 2.6) order_items
create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  product_id   uuid references products(id) on delete set null,
  product_name text not null,
  quantity     numeric(12,3) not null,
  unit         text not null,
  unit_price   numeric(12,2) not null,
  total        numeric(12,2) not null,
  created_at   timestamptz not null default now()
);

create index idx_order_items_order on order_items(order_id);

-- 2.7) calls
create table calls (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  customer_id    uuid references customers(id) on delete set null,
  phone          text not null,
  call_direction call_direction not null default 'incoming',
  duration       integer,
  record_url     text,
  transcript     text,
  ai_result      ai_result,
  created_at     timestamptz not null default now()
);

create index idx_calls_tenant on calls(tenant_id);

-- 2.8) whatsapp_messages
create table whatsapp_messages (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  direction   message_direction not null,
  message     text not null,
  media_url   text,
  created_at  timestamptz not null default now()
);

create index idx_whatsapp_tenant on whatsapp_messages(tenant_id);

-- 2.9) settings
create table settings (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null unique references tenants(id) on delete cascade,
  voice_gender             text not null default 'female',
  printer_enabled          boolean not null default false,
  whatsapp_group_enabled   boolean not null default false,
  payment_paytr            boolean not null default false,
  payment_iyzico           boolean not null default false,
  payment_website          boolean not null default false,
  website_url              text,
  callback_enabled         boolean not null default true,
  human_transfer_enabled   boolean not null default true,
  voice_recording_enabled  boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- 2.10) notifications
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  type       notification_type not null,
  title      text not null,
  message    text,
  status     notification_status not null default 'unread',
  created_at timestamptz not null default now()
);

create index idx_notifications_tenant on notifications(tenant_id);
create index idx_notifications_unread on notifications(tenant_id, status) where status = 'unread';

-- 2.11) ai_events (AI Olay GÃ¼nlÃ¼ÄŸÃ¼ - sadece sistem iÃ§i)
create table ai_events (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  order_id   uuid references orders(id) on delete set null,
  event_type ai_event_type not null,
  event_data jsonb,
  created_at timestamptz not null default now()
);

create index idx_ai_events_tenant on ai_events(tenant_id);
create index idx_ai_events_order on ai_events(order_id);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

alter table tenants enable row level security;
alter table users enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table calls enable row level security;
alter table whatsapp_messages enable row level security;
alter table settings enable row level security;
alter table notifications enable row level security;
alter table ai_events enable row level security;

-- Tenant'lar kendi verilerini gÃ¶rÃ¼r
create policy tenant_isolation_products on products
  for all using (tenant_id = auth.uid()::uuid);

create policy tenant_isolation_customers on customers
  for all using (tenant_id = auth.uid()::uuid);

create policy tenant_isolation_orders on orders
  for all using (tenant_id = auth.uid()::uuid);

create policy tenant_isolation_order_items on order_items
  for all using (order_id in (select id from orders where tenant_id = auth.uid()::uuid));

create policy tenant_isolation_calls on calls
  for all using (tenant_id = auth.uid()::uuid);

create policy tenant_isolation_whatsapp on whatsapp_messages
  for all using (tenant_id = auth.uid()::uuid);

create policy tenant_isolation_settings on settings
  for all using (tenant_id = auth.uid()::uuid);

create policy tenant_isolation_notifications on notifications
  for all using (tenant_id = auth.uid()::uuid);

create policy tenant_isolation_ai_events on ai_events
  for all using (tenant_id = auth.uid()::uuid);

-- ============================================================
-- 4. HELPER FUNCTIONS
-- ============================================================

-- SipariÅŸ numarasÄ± oluÅŸturucu (yÄ±la gÃ¶re sÄ±ralÄ±)
create or replace function generate_order_number(p_tenant_id uuid)
returns text language plpgsql as $$
declare
  year_prefix text;
  seq_num integer;
begin
  year_prefix := to_char(now(), 'YY');
  select coalesce(max(split_part(order_number, '-', 2)::integer), 0) + 1
    into seq_num
    from orders
   where tenant_id = p_tenant_id
     and order_number like year_prefix || '-%';
  return year_prefix || '-' || lpad(seq_num::text, 5, '0');
end;
$$;

-- created_at ve updated_at otomatik gÃ¼ncelleme
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_tenants_updated_at before update on tenants
  for each row execute function update_updated_at_column();

create trigger trg_products_updated_at before update on products
  for each row execute function update_updated_at_column();

create trigger trg_orders_updated_at before update on orders
  for each row execute function update_updated_at_column();

create trigger trg_settings_updated_at before update on settings
  for each row execute function update_updated_at_column();
