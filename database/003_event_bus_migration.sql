-- ============================================================
-- SiparişAsistanı - Event Bus + Yeni Modüller (ADIM 8-13)
-- ============================================================

-- CALL SESSIONS (ADIM 9)
create table call_sessions (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  phone         text not null,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  status        text not null default 'active',
  recording_url text,
  transcript    text,
  confidence    integer,
  created_at    timestamptz not null default now()
);

create index idx_call_sessions_tenant on call_sessions(tenant_id);
create index idx_call_sessions_phone on call_sessions(tenant_id, phone);

-- WHATSAPP CONVERSATIONS (ADIM 10)
create table whatsapp_conversations (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  customer_id     uuid references customers(id) on delete set null,
  phone           text not null,
  status          text not null default 'active',
  message_count   integer not null default 0,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_whatsapp_conversations_tenant on whatsapp_conversations(tenant_id);

-- whatsapp_messages tablosuna conversation_id ekle (mevcut tabloya kolon ekle)
alter table whatsapp_messages add column if not exists conversation_id uuid references whatsapp_conversations(id) on delete cascade;
alter table whatsapp_messages add column if not exists status text not null default 'sent';
alter table whatsapp_messages add column if not exists body text;
alter table whatsapp_messages add column if not exists attachment text;
-- mevcut message alanını body'ye kopyala
update whatsapp_messages set body = message where body is null;

-- PRINT QUEUE (ADIM 11)
create table print_jobs (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  order_id    uuid references orders(id) on delete cascade,
  status      text not null default 'pending',
  retry_count integer not null default 0,
  max_retries integer not null default 3,
  error_message text,
  printed_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index idx_print_jobs_tenant on print_jobs(tenant_id);
create index idx_print_jobs_pending on print_jobs(status) where status = 'pending';

-- SHIPMENTS (ADIM 12)
create table shipments (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  order_id       uuid not null references orders(id) on delete cascade,
  company        text,
  tracking_no    text,
  tracking_url   text,
  status         text not null default 'pending',
  notes          text,
  shipped_at     timestamptz,
  delivered_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_shipments_order on shipments(order_id);
create index idx_shipments_tracking on shipments(tracking_no);

-- PAYMENTS (ADIM 13)
create table payments (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  order_id          uuid not null references orders(id) on delete cascade,
  method            text not null,
  status            text not null default 'pending',
  amount            numeric(12,2) not null,
  transaction_id    text,
  transaction_date  timestamptz,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_payments_order on payments(order_id);
create index idx_payments_transaction on payments(transaction_id);

-- ACTIVITY LOG (En Büyük Eksik)
create table activity_logs (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  entity_type text not null,
  entity_id   uuid,
  event_type  text not null,
  description text not null,
  metadata    jsonb,
  actor_type  text not null default 'system',
  actor_id    uuid,
  created_at  timestamptz not null default now()
);

create index idx_activity_logs_tenant on activity_logs(tenant_id);
create index idx_activity_logs_entity on activity_logs(tenant_id, entity_type, entity_id);
create index idx_activity_logs_created on activity_logs(tenant_id, created_at desc);

-- ORDER tablosundaki kargo alanlarını kaldır (artık shipments'te)
-- Bu migration'ı production'da dikkatli yapmak lazım, şimdilik yorum
-- alter table orders drop column if exists cargo_company;
-- alter table orders drop column if exists tracking_number;

-- RLS POLICIES
alter table call_sessions enable row level security;
alter table whatsapp_conversations enable row level security;
alter table print_jobs enable row level security;
alter table shipments enable row level security;
alter table payments enable row level security;
alter table activity_logs enable row level security;

create policy tenant_isolation_call_sessions on call_sessions
  for all using (tenant_id = auth.uid()::uuid);
create policy tenant_isolation_whatsapp_convs on whatsapp_conversations
  for all using (tenant_id = auth.uid()::uuid);
create policy tenant_isolation_print_jobs on print_jobs
  for all using (tenant_id = auth.uid()::uuid);
create policy tenant_isolation_shipments on shipments
  for all using (tenant_id = auth.uid()::uuid);
create policy tenant_isolation_payments on payments
  for all using (tenant_id = auth.uid()::uuid);
create policy tenant_isolation_activity on activity_logs
  for all using (tenant_id = auth.uid()::uuid);
