
-- ============================================================
-- Sipari�Asistan� - Full Database Install (Enums already created)
-- ============================================================

create extension if not exists "pgcrypto";


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
  role       user_role not null default 'staff',
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

-- 2.11) ai_events (AI Olay Günlüğü - sadece sistem içi)
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

-- Tenant'lar kendi verilerini görür
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

-- Sipariş numarası oluşturucu (yıla göre sıralı)
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

-- created_at ve updated_at otomatik güncelleme
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

-- ===== 002_seed.sql =====

-- ============================================================
-- SiparişAsistanı - Seed Data (Demo)
-- ============================================================

-- Örnek Tenant: Ahmet İpek Sucukları
insert into tenants (id, company_name, domain, phone, email, iban, address, city, tax_number)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Ahmet İpek Sucukları',
  'ahmetipek',
  '05321234567',
  'info@ahmetipek.com',
  'TR12 0001 2345 6789 0001 2345 67',
  'Küçük Sanayi Sitesi No:42',
  'Afyonkarahisar',
  '1234567890'
);

-- Örnek Kullanıcı (Patron)
insert into users (id, tenant_id, name, email, phone, password, role)
values (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Ahmet İpek',
  'ahmet@ahmetipek.com',
  '05321234567',
  '$2a$10$placeholder_hash', -- gerçek hash ile değiştirilmeli
  'owner'
);

-- Örnek Ürünler (Ahmet İpek Sucukları - gerçek et ürünleri)
insert into products (id, tenant_id, product_name, category, price, unit) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Dana Parmak Sucuk', 'Sucuk', 890, 'KG'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Acılı Parmak Sucuk', 'Sucuk', 920, 'KG'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Kangal Sucuk', 'Sucuk', 750, 'KG'),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Kavurma', 'Kavurma', 650, 'KG'),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Pastırma', 'Pastırma', 1200, 'KG'),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Tulum Peyniri', 'Peynir', 380, 'KG'),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Afyon Kaymak', 'Kaymak', 450, 'KG');

-- Örnek Müşteri
insert into customers (id, tenant_id, name, phone, email, address, city, identity_number)
values (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Mehmet Yılmaz',
  '05339876543',
  'mehmet@example.com',
  'Çankaya Mah. No:10',
  'Ankara',
  '12345678901'
);

-- Örnek Sipariş (3 KG Dana Parmak Sucuk + 1 KG Pastırma)
insert into orders (id, tenant_id, customer_id, order_number, channel, status, payment_method, payment_status, total_price)
values (
  'e0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  '25-00001',
  'phone',
  'new',
  'iban',
  'waiting',
  3870
);

-- Örnek Sipariş Kalemleri
insert into order_items (order_id, product_id, product_name, quantity, unit, unit_price, total) values
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Dana Parmak Sucuk', 3, 'KG', 890, 2670),
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'Pastırma', 1, 'KG', 1200, 1200);

-- ===== 003_event_bus_migration.sql =====

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

-- ===== 004_enhancements.sql =====

-- ============================================================
-- SiparişAsistanı - Son İyileştirmeler (v1.0)
-- ============================================================

-- 1) TENANT SETTINGS (eski settings tablosunun yerine geçer)
drop table if exists settings cascade;

create table tenant_settings (
  id                        uuid primary key default gen_random_uuid(),
  tenant_id                 uuid not null unique references tenants(id) on delete cascade,
  -- Ses
  voice_gender              text not null default 'female',
  voice_speed               numeric(3,1) not null default 1.0,
  -- Bildirim
  printer_enabled           boolean not null default false,
  whatsapp_group_enabled    boolean not null default false,
  whatsapp_followup_enabled boolean not null default true,
  -- Ödeme
  iban_enabled              boolean not null default true,
  payment_link_enabled      boolean not null default false,
  website_redirect_enabled  boolean not null default false,
  -- İletişim
  human_transfer_enabled    boolean not null default true,
  callback_enabled          boolean not null default true,
  -- Kayıt
  record_calls              boolean not null default true,
  record_whatsapp           boolean not null default true,
  -- AI
  ai_tone                   text not null default 'professional',
  ai_provider               text not null default 'openai',
  ai_model                  text not null default 'gpt-4o-mini',
  -- Zaman
  updated_at                timestamptz not null default now()
);

create index idx_tenant_settings_tenant on tenant_settings(tenant_id);

-- 2) AI AUDIT LOGS (her AI sorgusu kaydedilir)
create table ai_audit_logs (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  session_id       text,
  conversation_id  uuid,
  -- Prompt
  system_prompt    text,
  user_message     text,
  -- Model
  model            text not null,
  provider         text not null,
  -- Response
  raw_response     text,
  parsed_json      jsonb,
  -- Performance
  confidence       integer,
  latency_ms       integer,
  token_prompt     integer,
  token_completion integer,
  -- Status
  success          boolean not null default true,
  error_message    text,
  created_at       timestamptz not null default now()
);

create index idx_ai_audit_tenant on ai_audit_logs(tenant_id);
create index idx_ai_audit_session on ai_audit_logs(session_id);
create index idx_ai_audit_created on ai_audit_logs(created_at desc);

-- 3) ORDERS - source alanı ekle
alter table orders add column if not exists source text not null default 'PHONE';
-- check constraint ekle
alter table orders add constraint orders_source_check
  check (source in ('PHONE', 'WHATSAPP', 'PANEL', 'WEBSITE'));

-- 4) KNOWLEDGE ARTICLES (şimdilik sadece şema, ileride kullanılacak)
create table knowledge_articles (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  category    text not null,
  title       text not null,
  content     text not null,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_knowledge_tenant on knowledge_articles(tenant_id);
create index idx_knowledge_category on knowledge_articles(tenant_id, category);

-- 5) RLS
alter table tenant_settings enable row level security;
alter table ai_audit_logs enable row level security;
alter table knowledge_articles enable row level security;

create policy tenant_isolation_tenant_settings on tenant_settings
  for all using (tenant_id = auth.uid()::uuid);
create policy tenant_isolation_ai_audit on ai_audit_logs
  for all using (tenant_id = auth.uid()::uuid);
create policy tenant_isolation_knowledge on knowledge_articles
  for all using (tenant_id = auth.uid()::uuid);

-- 6) Trigger
create trigger trg_tenant_settings_updated_at before update on tenant_settings
  for each row execute function update_updated_at_column();

create trigger trg_knowledge_updated_at before update on knowledge_articles
  for each row execute function update_updated_at_column();

-- ===== 005_soft_delete.sql =====

-- ============================================================
-- SiparişAsistanı - Soft Delete (v1.0)
-- ============================================================

-- Tüm tablolara deleted_at alanı ekle
-- Hiçbir tabloda gerçek DELETE yok, hepsi soft delete

alter table tenants add column if not exists deleted_at timestamptz;
alter table users add column if not exists deleted_at timestamptz;
alter table products add column if not exists deleted_at timestamptz;
alter table customers add column if not exists deleted_at timestamptz;
alter table orders add column if not exists deleted_at timestamptz;
alter table order_items add column if not exists deleted_at timestamptz;
alter table calls add column if not exists deleted_at timestamptz;
alter table whatsapp_messages add column if not exists deleted_at timestamptz;
alter table whatsapp_conversations add column if not exists deleted_at timestamptz;
alter table notifications add column if not exists deleted_at timestamptz;
alter table call_sessions add column if not exists deleted_at timestamptz;
alter table print_jobs add column if not exists deleted_at timestamptz;
alter table shipments add column if not exists deleted_at timestamptz;
alter table payments add column if not exists deleted_at timestamptz;
alter table knowledge_articles add column if not exists deleted_at timestamptz;

-- ORDER tablosuna müşteri notu ekle (Conversation Replay için)
alter table orders add column if not exists customer_note text;
alter table orders add column if not exists ai_transcript text;
alter table orders add column if not exists ai_confidence integer;

-- ===== 006_brain.sql =====

-- ============================================================
-- SiparişAsistanı - AI Brain + Maintenance Mode
-- ============================================================

-- Maintenance Mode için tenant_settings'e alan ekle
alter table tenant_settings add column if not exists maintenance_mode boolean not null default false;
alter table tenant_settings add column if not exists maintenance_message text default 'Şu an sipariş hizmetimiz geçici olarak kullanılamamaktadır.';

-- Conversation session'ları için (webhook giriş/çıkış arası kayıt)
create table if not exists conversation_sessions (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  channel         text not null check (channel in ('phone', 'whatsapp')),
  phone           text not null,
  status          text not null default 'active' check (status in ('active', 'completed', 'transferred', 'failed')),
  messages        jsonb default '[]'::jsonb,
  session_data    jsonb,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_conv_sessions_tenant on conversation_sessions(tenant_id);
create index idx_conv_sessions_phone on conversation_sessions(tenant_id, phone);
create index idx_conv_sessions_active on conversation_sessions(status) where status = 'active';

alter table conversation_sessions enable row level security;

create policy tenant_isolation_conv_sessions on conversation_sessions
  for all using (tenant_id = auth.uid()::uuid);

-- ===== 007_session_upgrade.sql =====

-- ============================================================
-- SiparişAsistanı - Session + Provider İyileştirmeleri
-- ============================================================

-- 1) conversation_sessions geliştirme
alter table conversation_sessions add column if not exists channel_source text;
alter table conversation_sessions add column if not exists provider text;
alter table conversation_sessions add column if not exists session_label text;
alter table conversation_sessions add column if not exists duration_seconds integer;
alter table conversation_sessions add column if not exists ai_model text;
alter table conversation_sessions add column if not exists end_reason text;
alter table conversation_sessions add column if not exists retry_count integer not null default 0;
alter table conversation_sessions add column if not exists language text not null default 'tr';

-- session_label için unique index (okunabilir ID)
create unique index if not exists idx_conv_sessions_label on conversation_sessions(session_label);

-- 2) Session label üreteci fonksiyonu
create or replace function generate_session_label()
returns text language plpgsql as $$
declare
  date_part text;
  seq_num integer;
  label text;
begin
  date_part := to_char(now(), 'YYYYMMDD');
  select coalesce(max(split_part(session_label, '-', 2)::integer), 0) + 1
    into seq_num
    from conversation_sessions
   where session_label like 'SESSION-' || date_part || '-%';
  label := 'SESSION-' || date_part || '-' || lpad(seq_num::text, 6, '0');
  return label;
end;
$$;

-- 3) trigger: session oluşurken label otomatik üretilsin
create or replace function trg_set_session_label()
returns trigger language plpgsql as $$
begin
  if new.session_label is null then
    new.session_label := generate_session_label();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_conv_sessions_label on conversation_sessions;
create trigger trg_conv_sessions_label before insert on conversation_sessions
  for each row execute function trg_set_session_label();

-- ===== 008_golden_voice.sql =====

-- ============================================================
-- SiparişAsistanı - Golden Voice Rules
-- ============================================================
alter table tenant_settings add column if not exists ai_style text not null default 'yoresel'
  check (ai_style in ('resmi', 'samimi', 'yoresel'));

-- ===== 009_production_ready.sql =====

-- ============================================================
-- SiparişAsistanı - Production Ready (v1.0)
-- ============================================================

-- 1) BUSINESS HOURS
alter table tenant_settings add column if not exists business_hours_start time not null default '08:00';
alter table tenant_settings add column if not exists business_hours_end time not null default '18:30';
alter table tenant_settings add column if not exists business_hours_enabled boolean not null default false;
alter table tenant_settings add column if not exists after_hours_message text
  default 'Siparişinizi memnuniyetle not alıyorum. İşletmemiz mesai saatleri içinde siparişinizi onaylayacaktır.';

-- 2) AI MOOD
alter table tenant_settings add column if not exists voice_speed text not null default 'normal'
  check (voice_speed in ('slow', 'normal', 'fast'));
alter table tenant_settings add column if not exists voice_energy text not null default 'normal'
  check (voice_energy in ('calm', 'normal', 'energetic'));
alter table tenant_settings add column if not exists conversation_length text not null default 'normal'
  check (conversation_length in ('short', 'normal', 'detailed'));

-- 3) VOICE PERSONA
alter table tenant_settings add column if not exists voice_persona text;
alter table tenant_settings add column if not exists voice_persona_gender text;

-- 4) AI LEARNING QUEUE (insan düzeltmeleri)
create table if not exists ai_learning_queue (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  session_id      uuid references conversation_sessions(id) on delete set null,
  order_id        uuid references orders(id) on delete set null,
  transcript      text,
  ai_json         jsonb,
  human_edit      jsonb,
  confidence      integer,
  reason          text,
  status          text not null default 'pending' check (status in ('pending', 'reviewed', 'applied')),
  created_at      timestamptz not null default now()
);

create index idx_ai_learning_tenant on ai_learning_queue(tenant_id);
create index idx_ai_learning_status on ai_learning_queue(status);

-- 5) ORDER LOCK (çift çalışan engeli)
create table if not exists order_locks (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null unique references orders(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  user_name   text not null,
  locked_at   timestamptz not null default now(),
  expires_at  timestamptz not null
);

create index idx_order_locks_order on order_locks(order_id);
create index idx_order_locks_expires on order_locks(expires_at);

-- 6) RLS
alter table ai_learning_queue enable row level security;
alter table order_locks enable row level security;

create policy tenant_isolation_ai_learning on ai_learning_queue
  for all using (tenant_id = auth.uid()::uuid);
create policy tenant_isolation_order_locks on order_locks
  for all using (order_id in (select id from orders where tenant_id = auth.uid()::uuid));

-- ===== 010_voice_engine.sql =====

-- ============================================================
-- SiparişAsistanı - Voice Engine (TTS)
-- ============================================================
alter table tenant_settings add column if not exists voice_provider text not null default 'elevenlabs'
  check (voice_provider in ('elevenlabs', 'openai', 'azure'));
alter table tenant_settings add column if not exists voice_stability numeric(3,2) not null default 0.50;
alter table tenant_settings add column if not exists voice_style numeric(3,2) not null default 0.50;
alter table tenant_settings add column if not exists voice_similarity numeric(3,2) not null default 0.75;

-- Ses önbellek tablosu
create table if not exists voice_cache (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  hash_key      text not null,
  text          text not null,
  voice_persona text,
  provider      text not null,
  duration_ms   integer,
  file_url      text not null,
  file_size     integer,
  used_count    integer not null default 1,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz not null default now()
);

create unique index idx_voice_cache_key on voice_cache(tenant_id, hash_key, voice_persona);
create index idx_voice_cache_used on voice_cache(used_count desc);

alter table voice_cache enable row level security;
create policy tenant_isolation_voice_cache on voice_cache
  for all using (tenant_id = auth.uid()::uuid);

-- ===== 011_voice_pro_v2.sql =====

-- ============================================================
-- SiparişAsistanı - Voice Engine Pro v2
-- ============================================================

-- Enhanced tenant_settings for voice
alter table tenant_settings add column if not exists voice_enabled boolean not null default true;
alter table tenant_settings add column if not exists voice_cache_enabled boolean not null default true;
alter table tenant_settings add column if not exists voice_streaming boolean not null default false;
alter table tenant_settings add column if not exists voice_fallback_enabled boolean not null default true;
alter table tenant_settings add column if not exists voice_pitch numeric(3,2) not null default 1.0;
alter table tenant_settings add column if not exists voice_persona_data jsonb;

-- Voice analytics logs
create table if not exists voice_logs (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id) on delete set null,
  session_id      uuid,
  provider        text not null,
  persona         text,
  text_length     integer not null,
  duration_ms     integer,
  cache_hit       boolean not null default false,
  cost            numeric(10,6) not null default 0,
  audio_size      integer,
  success         boolean not null default true,
  error_message   text,
  created_at      timestamptz not null default now()
);

create index idx_voice_logs_tenant on voice_logs(tenant_id);
create index idx_voice_logs_provider on voice_logs(provider);
create index idx_voice_logs_created on voice_logs(created_at desc);

alter table voice_logs enable row level security;
create policy tenant_isolation_voice_logs on voice_logs
  for all using (tenant_id = auth.uid()::uuid);

-- ===== 012_telephony.sql =====

-- ============================================================
-- SiparişAsistanı - Telephony + Call Recordings
-- ============================================================

-- Call sessions için status alanları (mevcut conversation_sessions geliştirme)
alter table conversation_sessions add column if not exists call_status text
  check (call_status in (
    'RINGING','ANSWERED','AI_SPEAKING','CUSTOMER_SPEAKING',
    'PROCESSING','WAITING_CONFIRMATION','COMPLETED',
    'HUMAN_TRANSFER','FAILED','TIMEOUT'
  ));
alter table conversation_sessions add column if not exists call_duration integer;
alter table conversation_sessions add column if not exists call_recording_url text;

-- Call recordings
create table if not exists call_recordings (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  session_id        uuid references conversation_sessions(id) on delete set null,
  phone             text not null,
  direction         text not null check (direction in ('incoming', 'outgoing')),
  recording_url     text,
  duration_seconds  integer,
  file_size         integer,
  transcript        text,
  status            text not null default 'completed',
  created_at        timestamptz not null default now()
);

create index idx_call_recordings_tenant on call_recordings(tenant_id);
create index idx_call_recordings_session on call_recordings(session_id);

alter table call_recordings enable row level security;
create policy tenant_isolation_call_recordings on call_recordings
  for all using (tenant_id = auth.uid()::uuid);

-- ===== 013_crm_timeline.sql =====

-- ============================================================
-- SiparişAsistanı - CRM Timeline + Order Status
-- ============================================================

-- Drop old check constraint and create new one
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in (
    'new','PAYMENT_WAITING','PAYMENT_CONFIRMED',
    'PACKAGING','PACKAGED','shipped','DELIVERED',
    'completed','cancelled'
  ));

-- activity_logs'a channel alanı ekle
alter table activity_logs add column if not exists channel text
  check (channel in ('VOICE','WHATSAPP','WEB','PANEL','SYSTEM'));
alter table activity_logs add column if not exists event_icon text;

-- ===== 013_omnichannel.sql =====

-- Omnichannel: Instagram + Website source types
alter table orders drop constraint if exists orders_source_check;
alter table orders alter column source set default 'PHONE';
update orders set source = 'PHONE' where source is null;
alter table orders add constraint orders_source_check
  check (source in ('PHONE', 'WHATSAPP', 'INSTAGRAM', 'WEBSITE', 'MANUAL', 'WHOLESALE'));

-- Instagram conversations
create table if not exists instagram_conversations (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  instagram_user_id text not null,
  customer_id       uuid references customers(id) on delete set null,
  username          text,
  status            text not null default 'active',
  last_message_at   timestamptz,
  message_count     integer not null default 0,
  created_at        timestamptz not null default now()
);

-- Instagram messages
create table if not exists instagram_messages (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  conversation_id   uuid references instagram_conversations(id) on delete cascade,
  direction         text not null check (direction in ('incoming', 'outgoing')),
  body              text not null,
  media_url         text,
  created_at        timestamptz not null default now()
);

-- Webhook configuration for web sites
create table if not exists webhook_configs (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  platform          text not null check (platform in ('woocommerce', 'shopify', 'ideasoft', 'ticimax', 'custom')),
  webhook_url       text,
  api_key           text,
  active            boolean not null default false,
  last_sync_at      timestamptz,
  settings          jsonb default '{}',
  created_at        timestamptz not null default now()
);

-- Add source to conversation_sessions
alter table conversation_sessions add column if not exists source text;
alter table conversation_sessions add column if not exists instagram_conversation_id uuid references instagram_conversations(id) on delete set null;

-- Add customer_note to orders
alter table orders add column if not exists customer_note text;

-- ===== 013_product_engine_pro.sql =====

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

-- ===== 014_brand_voice.sql =====

-- ============================================================
-- SiparişAsistanı - Brand Voice + Son İyileştirmeler
-- ============================================================
alter table tenant_settings add column if not exists brand_voice text not null default 'yoresel'
  check (brand_voice in ('geleneksel', 'samimi', 'premium', 'kurumsal', 'yoresel'));
alter table tenant_settings add column if not exists greeting_style text not null default 'firma_ad'
  check (greeting_style in ('firma_ad', 'musteri_hizmetleri', 'sade', 'ai_asistani'));

-- ===== 014_ticari_operasyon.sql =====

-- v1.3 Ticari Operasyon

-- 1. Cari Hesap için müşteri bakiyesi
alter table customers add column if not exists balance numeric(12,2) not null default 0;
alter table customers add column if not exists credit_limit numeric(12,2) default 0;
alter table customers add column if not exists payment_term int default 0; -- 0=pesin, 30=30gun, 60, 90

-- 2. Minimum sipariş adedi
alter table products add column if not exists min_order_qty numeric(10,2) default 0;
alter table products add column if not exists wholesale_price numeric(12,2); -- toptan fiyat (opsiyonel)

-- 3. Satış tiplerine Tepsi/Palet ekle (enum degil text array)
-- products.sale_types zaten jsonb/text[] oldugu icin ekstra islem gerekmez

-- 4. Müşteri bazlı özel fiyat listesi
create table if not exists customer_prices (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  customer_id       uuid not null references customers(id) on delete cascade,
  product_id        uuid references products(id) on delete cascade,
  product_name      text not null,
  unit              text not null default 'KG',
  price             numeric(12,2) not null,
  min_quantity      numeric(10,2) default 0,
  valid_from        date,
  valid_until       date,
  created_at        timestamptz not null default now(),
  unique(tenant_id, customer_id, product_id, unit)
);

-- 5. Cari hesap hareketleri
create table if not exists account_transactions (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  customer_id       uuid not null references customers(id) on delete cascade,
  type              text not null check (type in ('invoice', 'payment', 'refund', 'credit', 'debit')),
  amount            numeric(12,2) not null,
  balance_after     numeric(12,2) not null,
  reference_id      text, -- order_id veya payment_id
  description       text,
  due_date          date,
  created_at        timestamptz not null default now()
);

-- 6. Siparişe vade bilgisi
alter table orders add column if not exists payment_term int default 0;
alter table orders add column if not exists due_date date;

-- ===== 015_kvkk_compliance.sql =====

-- KVKK Compliance: data retention and privacy

-- Tenant-level retention settings
alter table tenant_settings add column if not exists recording_retention_days integer not null default 90;
alter table tenant_settings add column if not exists audit_log_retention_days integer not null default 365;
alter table tenant_settings add column if not exists auto_cleanup_enabled boolean not null default false;

-- Index for cleanup queries
create index if not exists idx_call_recordings_created_at on call_recordings(created_at);
create index if not exists idx_ai_audit_logs_created_at on ai_audit_logs(created_at);
create index if not exists idx_activity_logs_created_at on activity_logs(created_at);
create index if not exists idx_instagram_messages_created_at on instagram_messages(created_at);

-- ===== 015_real_data_append.sql =====

-- ============================================================
-- SiparişAsistanı - Mevcut Tenant'a Veri Ekle
-- (tenant zaten var, ürün/kampanya ekle)
-- ============================================================

-- Tenant ID'yi bul (ahmetipek domain'inden)
do $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id from tenants where domain = 'ahmetipek' limit 1;

  -- Settings (brand voice)
  insert into tenant_settings (tenant_id, voice_gender, brand_voice, greeting_style, ai_style,
    iban_enabled, human_transfer_enabled, callback_enabled, record_calls)
  values (v_tenant_id, 'male', 'yoresel', 'firma_ad', 'yoresel',
    true, true, true, true)
  on conflict (tenant_id) do update set
    brand_voice = excluded.brand_voice,
    greeting_style = excluded.greeting_style,
    ai_style = excluded.ai_style;

  -- Ürünler
  insert into products (tenant_id, product_name, category, price, unit, sale_types, variable_weight, avg_weight_gr, min_weight_gr, max_weight_gr, ai_rules) values
    (v_tenant_id, 'Dana Parmak Sucuk', 'Sucuk', 890, 'KG', '["KG","SAP"]', true, 600, 500, 700, 'Sap ağırlığı üretime göre 500-700gr arası değişir. Net fiyat tartımdan sonra hesaplanır.'),
    (v_tenant_id, 'Acılı Parmak Sucuk', 'Sucuk', 920, 'KG', '["KG","SAP"]', true, 600, 500, 700, 'Sap ağırlığı değişkendir.'),
    (v_tenant_id, 'Kangal Sucuk', 'Sucuk', 750, 'KG', '["KG"]', false, null, null, null, null),
    (v_tenant_id, 'Kavurma', 'Kavurma', 650, 'KG', '["KG","KOLI"]', false, null, null, null, 'Koli: 5 kg'),
    (v_tenant_id, 'Pastırma', 'Pastırma', 1200, 'KG', '["KG"]', false, null, null, null, null),
    (v_tenant_id, 'Tulum Peyniri', 'Peynir', 380, 'KG', '["KG"]', false, null, null, null, null),
    (v_tenant_id, 'Afyon Kaymak', 'Kaymak', 450, 'KG', '["KG","KUTU"]', false, null, null, null, 'Kutu: 500 gr')
  on conflict do nothing;

  -- Kampanya
  insert into campaigns (tenant_id, title, description, condition, offer, min_quantity, target_product, start_date, end_date, active)
  values (v_tenant_id, 'Yaz Kampanyası', '2 kilo ve üzeri sucuk alımlarında yarım kilo kavurma %20 indirimli',
    '2 KG ve üzeri sucuk alımında', '500 gr Kavurma %20 indirimli', 2, 'Sucuk',
    '2026-01-01', '2026-12-31', true)
  on conflict do nothing;
end $$;

-- ===== 015_real_tenant_seed.sql =====

-- ============================================================
-- SiparişAsistanı - Gerçek Tenant Seed (Test Verisi)
-- ============================================================

-- Tenant: Ahmet İpek Sucukları
insert into tenants (id, company_name, domain, phone, email, iban, address, city, tax_number)
values ('11111111-1111-1111-1111-111111111111', 'Ahmet İpek Sucukları', 'ahmetipek2',
  '05321234567', 'info@ahmetipek.com',
  'TR12 0001 2345 6789 0001 2345 67',
  'Küçük Sanayi Sitesi No:42', 'Afyonkarahisar', '1234567890')
on conflict (id) do nothing;

-- Kullanıcı
insert into users (id, tenant_id, name, email, phone, password, role)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
  'Ahmet İpek', 'ahmet@ahmetipek.com', '05321234567', '$2a$10$placeholder', 'owner')
on conflict (id) do nothing;

-- Tenant Settings (Brand Voice + Yöresel)
insert into tenant_settings (tenant_id, voice_gender, brand_voice, greeting_style, ai_style,
  iban_enabled, human_transfer_enabled, callback_enabled, record_calls)
values ('11111111-1111-1111-1111-111111111111',
  'male', 'yoresel', 'firma_ad', 'yoresel',
  true, true, true, true)
on conflict (tenant_id) do nothing;

-- Ürünler (Gerçek esnaf ürünleri - çoklu satış tipi ile)
insert into products (tenant_id, product_name, category, price, unit, sale_types, variable_weight, avg_weight_gr, min_weight_gr, max_weight_gr, ai_rules) values
  ('11111111-1111-1111-1111-111111111111', 'Dana Parmak Sucuk', 'Sucuk', 890, 'KG', '["KG","SAP"]', true, 600, 500, 700, 'Sap ağırlığı üretime göre 500-700gr arası değişir. Net fiyat tartımdan sonra hesaplanır.'),
  ('11111111-1111-1111-1111-111111111111', 'Acılı Parmak Sucuk', 'Sucuk', 920, 'KG', '["KG","SAP"]', true, 600, 500, 700, 'Sap ağırlığı değişkendir.'),
  ('11111111-1111-1111-1111-111111111111', 'Kangal Sucuk', 'Sucuk', 750, 'KG', '["KG"]', false, null, null, null, null),
  ('11111111-1111-1111-1111-111111111111', 'Kavurma', 'Kavurma', 650, 'KG', '["KG","KOLI"]', false, null, null, null, 'Koli: 5 kg'),
  ('11111111-1111-1111-1111-111111111111', 'Pastırma', 'Pastırma', 1200, 'KG', '["KG"]', false, null, null, null, null),
  ('11111111-1111-1111-1111-111111111111', 'Tulum Peyniri', 'Peynir', 380, 'KG', '["KG"]', false, null, null, null, null),
  ('11111111-1111-1111-1111-111111111111', 'Afyon Kaymak', 'Kaymak', 450, 'KG', '["KG","KUTU"]', false, null, null, null, 'Kutu: 500 gr')
on conflict do nothing;

-- Örnek Müşteri
insert into customers (id, tenant_id, name, phone, email, address, city)
values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
  'Mehmet Yılmaz', '05339876543', 'mehmet@example.com',
  'Çankaya Mah. No:10', 'Ankara')
on conflict (id) do nothing;

-- Kampanya
insert into campaigns (tenant_id, title, description, condition, offer, min_quantity, target_product, start_date, end_date, active)
values ('11111111-1111-1111-1111-111111111111',
  'Yaz Kampanyası',
  '2 kilo ve üzeri sucuk alımlarında yarım kilo kavurma %20 indirimli',
  '2 KG ve üzeri sucuk alımında',
  '500 gr Kavurma %20 indirimli',
  2, 'Sucuk',
  '2026-01-01', '2026-12-31', true)
on conflict do nothing;

-- ===== 016_api_keys.sql =====

-- API Key Management
create table if not exists api_keys (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  provider          text not null check (provider in ('meta_whatsapp', 'meta_instagram', 'netgsm', 'deepseek', 'openai', 'elevenlabs', 'supabase')),
  label             text not null,
  api_key           text,
  api_secret        text,
  extra_config      jsonb default '{}',
  active            boolean not null default true,
  last_tested_at    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(tenant_id, provider)
);

-- ===== 016_core_policy.sql =====

-- ============================================================
-- SiparişAsistanı - Core Policy + Kargo Ayarları
-- ============================================================
alter table tenant_settings add column if not exists yurtici_enabled boolean not null default false;
alter table tenant_settings add column if not exists yurtici_price numeric(8,2) default 0;
alter table tenant_settings add column if not exists mng_enabled boolean not null default false;
alter table tenant_settings add column if not exists mng_price numeric(8,2) default 0;
alter table tenant_settings add column if not exists aras_enabled boolean not null default false;
alter table tenant_settings add column if not exists aras_price numeric(8,2) default 0;
alter table tenant_settings add column if not exists free_shipping_min numeric(8,2) default 0;

-- ===== 017_alias_clarify.sql =====

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

-- ===== 017_sales_engine.sql =====

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

-- ===== 020_demo_seed.sql =====

-- ============================================================
-- SiparişAsistanı - Demo Tenant Seed (Kapsamlı)
-- ============================================================

do $$
declare
  v_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
  v_customer_id uuid;
  v_order_id uuid;
  v_date timestamptz;
  v_status order_status;
  v_source text;
  v_channel order_channel;
  v_product_ids uuid[];
  v_product_names text[] := array['Dana Parmak Sucuk','Acılı Parmak Sucuk','Kangal Sucuk','Pastırma','Kavurma','Tulum Peyniri','Afyon Kaymak'];
  v_product_prices numeric[] := array[890,920,750,1200,650,380,450];
  v_customer_names text[] := array['Mehmet Yılmaz','Ayşe Demir','Ali Kaya','Fatma Şahin','Mustafa Öztürk','Zeynep Arslan','İbrahim Yıldız','Hatice Çelik','Ahmet Kurt','Elif Koç'];
  v_customer_phones text[] := array['05321234567','05339876543','05411223344','05449876543','05551234567','05328765432','05438765432','05559876543','05321239876','05411239876'];
  i int; j int; k int; seq int := 0;
begin
  -- Tenant
  insert into tenants (id, company_name, domain, phone, email, iban, address, city, tax_number)
  values (v_tenant_id, 'Demo İşletme', 'demo', '05320000000', 'demo@demo.com',
    'TR12 0001 2345 6789 0001 2345 67', 'Atatürk Cad. No:42', 'Afyonkarahisar', '1234567890')
  on conflict (id) do nothing;

  -- Settings
  insert into tenant_settings (tenant_id, voice_gender, brand_voice, greeting_style, ai_style,
    iban_enabled, human_transfer_enabled, callback_enabled, record_calls, business_hours_enabled,
    business_hours_start, business_hours_end)
  values (v_tenant_id, 'female', 'yoresel', 'firma_ad', 'yoresel',
    true, true, true, true, true, '08:00', '18:30')
  on conflict (tenant_id) do nothing;

  -- Ürünler
  for i in 1..array_length(v_product_names, 1) loop
    insert into products (tenant_id, product_name, category, price, unit, sale_types)
    values (v_tenant_id, v_product_names[i], 'Kasap Ürünleri', v_product_prices[i], 'KG',
      (case when v_product_names[i] like '%Sucuk%' then '["KG","SAP"]' else '["KG"]' end)::jsonb)
    on conflict do nothing;
  end loop;

  -- Müşteriler (20 adet)
  for i in 1..20 loop
    v_customer_id := gen_random_uuid();
    insert into customers (id, tenant_id, name, phone, city)
    values (v_customer_id, v_tenant_id,
      v_customer_names[1 + (i % 10)],
      v_customer_phones[1 + (i % 10)],
      case when i % 3 = 0 then 'İstanbul' when i % 3 = 1 then 'Ankara' else 'Afyonkarahisar' end)
    on conflict (id) do nothing;

    -- Siparişler (50 adet = 20*50 = 1000 toplam)
    for j in 1..50 loop
      v_date := now() - ((i * 5 + j) * interval '1 hour');
      v_status := case when j % 10 < 6 then 'DELIVERED'::order_status when j % 10 < 8 then 'shipped'::order_status when j % 10 < 9 then 'PACKAGING'::order_status else 'PAYMENT_CONFIRMED'::order_status end;
      v_channel := case when j % 3 = 0 then 'whatsapp'::order_channel else 'phone'::order_channel end;
      v_source := case when v_channel = 'whatsapp'::order_channel then 'WHATSAPP'::text else 'PHONE'::text end;

      seq := seq + 1;
      v_order_id := gen_random_uuid();
      insert into orders (id, tenant_id, customer_id, order_number, channel, source, status,
        payment_method, payment_status, total_price, created_at, updated_at)
      values (v_order_id, v_tenant_id, v_customer_id,
        '25-' || lpad(seq::text, 5, '0'),
        v_channel, v_source,
        v_status, 'iban'::payment_method,
        case when v_status in ('DELIVERED'::order_status, 'shipped'::order_status, 'completed'::order_status) then 'paid'::payment_status else 'waiting'::payment_status end,
        v_product_prices[1 + (j % 7)] * (1 + (j % 3)),
        v_date, v_date)
      on conflict (id) do nothing;

      -- Order items
      for k in 1..(1 + (j % 3)) loop
        insert into order_items (order_id, product_id, product_name, quantity, unit, unit_price, total)
        values (v_order_id,
          (select id from products where tenant_id = v_tenant_id order by random() limit 1),
          v_product_names[1 + ((j + k) % 7)], 1 + (j % 5), 'KG',
          v_product_prices[1 + ((j + k) % 7)],
          v_product_prices[1 + ((j + k) % 7)] * (1 + (j % 3)))
        on conflict do nothing;
      end loop;

      -- Activity logs (timeline)
      insert into activity_logs (tenant_id, entity_type, entity_id, event_type, description, channel, event_icon, actor_type, created_at)
      values (v_tenant_id, 'order', v_order_id, 'ORDER_CREATED',
        'AI, ' || case when v_channel = 'whatsapp'::order_channel then 'WhatsApp' else 'Telefon' end ||
        ' üzerinden ' || v_customer_names[1 + (i % 10)] || ' adına sipariş oluşturdu.',
        case when v_channel = 'whatsapp'::order_channel then 'WHATSAPP' else 'VOICE' end, '🛒', 'AI', v_date)
      on conflict do nothing;
    end loop;
  end loop;

  -- Kampanya
  insert into campaigns (tenant_id, title, description, condition, offer, min_quantity, target_product, start_date, end_date, active)
  values (v_tenant_id, 'Yaz Kampanyası', '3 KG ve üzeri sucuk alımlarında 500 gr kavurma hediye',
    '3 KG ve üzeri sucuk alımında', '500 gr Kavurma Hediye', 3, 'Sucuk',
    '2026-01-01', '2026-12-31', true)
  on conflict do nothing;

  -- Şikayetler
  for i in 1..5 loop
    insert into activity_logs (tenant_id, entity_type, event_type, description, channel, event_icon, actor_type, metadata, created_at)
    values (v_tenant_id, 'complaint', 'COMPLAINT_OPEN',
      '⚠️ AI, ' || v_customer_names[1 + (i % 10)] || ' için şikayet kaydı oluşturdu.',
      'VOICE', '⚠️', 'AI',
      jsonb_build_object('type', 'WRONG_PRODUCT', 'severity', 'HIGH', 'ticket_number', 'DEMO-' || lpad(i::text, 4, '0')),
      now() - (i * 2 * interval '1 day'))
    on conflict do nothing;
  end loop;
end $$;

-- ===== 021_api_keys_v2.sql =====

-- API Keys v2 - Expanded providers & printer settings
alter table api_keys drop constraint if exists api_keys_provider_check;
alter table api_keys add constraint api_keys_provider_check
  check (provider in ('meta_whatsapp', 'meta_instagram', 'netgsm', 'deepseek', 'openai', 'elevenlabs', 'supabase', 'anthropic', 'bilge_ai', 'twilio', 'azure_speech', 'openai_tts'));

alter table tenant_settings add column if not exists whatsapp_enabled boolean not null default false;
alter table tenant_settings add column if not exists instagram_enabled boolean not null default false;
alter table tenant_settings add column if not exists phone_enabled boolean not null default false;
alter table tenant_settings add column if not exists website_enabled boolean not null default true;
alter table tenant_settings add column if not exists printer_type text not null default 'thermal';
alter table tenant_settings add column if not exists printer_copy_count integer not null default 1;

-- ===== 021_fix_encoding.sql =====

-- Türkçe karakter düzeltme
update customers set name = 'Mehmet Yılmaz' where phone = '05321234567' and tenant_id = '00000000-0000-0000-0000-000000000001';
update customers set name = 'Ayşe Demir' where phone = '05339876543' and tenant_id = '00000000-0000-0000-0000-000000000001';
update customers set name = 'Ali Kaya' where phone = '05411223344' and tenant_id = '00000000-0000-0000-0000-000000000001';
update customers set name = 'Fatma Şahin' where phone = '05449876543' and tenant_id = '00000000-0000-0000-0000-000000000001';
update customers set name = 'Mustafa Öztürk' where phone = '05551234567' and tenant_id = '00000000-0000-0000-0000-000000000001';
update customers set name = 'Zeynep Arslan' where phone = '05328765432' and tenant_id = '00000000-0000-0000-0000-000000000001';
update customers set name = 'İbrahim Yıldız' where phone = '05438765432' and tenant_id = '00000000-0000-0000-0000-000000000001';
update customers set name = 'Hatice Çelik' where phone = '05559876543' and tenant_id = '00000000-0000-0000-0000-000000000001';
update customers set name = 'Ahmet Kurt' where phone = '05321239876' and tenant_id = '00000000-0000-0000-0000-000000000001';
update customers set name = 'Elif Koç' where phone = '05411239876' and tenant_id = '00000000-0000-0000-0000-000000000001';

-- ===== 022_business_settings_v2.sql =====

-- Business Settings v2 — Day-based hours, payments, delivery, cargo rules
alter table tenant_settings add column if not exists after_hours_behavior text not null default 'hold_order';
alter table tenant_settings add column if not exists business_hours_data jsonb default '{"monday":{"open":true,"start":"08:00","end":"18:30"},"tuesday":{"open":true,"start":"08:00","end":"18:30"},"wednesday":{"open":true,"start":"08:00","end":"18:30"},"thursday":{"open":true,"start":"08:00","end":"18:30"},"friday":{"open":true,"start":"08:00","end":"18:30"},"saturday":{"open":false,"start":"08:00","end":"14:00"},"sunday":{"open":false,"start":"08:00","end":"14:00"}}';

alter table tenant_settings add column if not exists whatsapp_group_id text;
alter table tenant_settings add column if not exists printer_beep_enabled boolean not null default true;
alter table tenant_settings add column if not exists web_notifications_enabled boolean not null default true;

alter table tenant_settings add column if not exists cash_on_delivery_enabled boolean not null default true;
alter table tenant_settings add column if not exists card_on_delivery_enabled boolean not null default false;
alter table tenant_settings add column if not exists bank_name text;
alter table tenant_settings add column if not exists recipient_name text;
alter table tenant_settings add column if not exists iban_number text;
alter table tenant_settings add column if not exists min_order_amount numeric(10,2) default 0;

alter table tenant_settings add column if not exists excluded_regions jsonb default '[]';
alter table tenant_settings add column if not exists international_shipping_enabled boolean not null default false;
alter table tenant_settings add column if not exists shipping_countries jsonb default '[]';

alter table tenant_settings add column if not exists city_delivery_time text;
alter table tenant_settings add column if not exists intercity_cargo_time text;
alter table tenant_settings add column if not exists delivery_rules jsonb default '[]';

-- ===== 022_conversations_seed.sql =====

-- Demo conversation data for tenant 00000000-0000-0000-0000-000000000001
do $$
declare
  v_tid uuid := '00000000-0000-0000-0000-000000000001';
  v_sid uuid;
  i int;
begin
  for i in 1..5 loop
    v_sid := gen_random_uuid();
    insert into conversation_sessions (id, tenant_id, channel, channel_source, phone, status, call_status, session_label, call_duration, ai_model, created_at, ended_at)
    values (v_sid, v_tid, 'phone', 'netgsm',
      case when i % 2 = 0 then '05321234567' else '05339876543' end,
      'completed', 'COMPLETED',
      'SESSION-20260722-' || lpad(i::text, 4, '0'),
      120 + i * 30, 'deepseek-chat',
      now() - (i * 2 * interval '1 hour'),
      now() - (i * 2 * interval '1 hour') + interval '3 minutes')
    on conflict (id) do nothing;
  end loop;
end $$;

-- ===== 023_demo_user.sql =====

-- Demo user for tenant 00000000-0000-0000-0000-000000000001
-- Password: demo123 (SHA256 hash)
insert into users (tenant_id, name, email, phone, password, role, active)
select '00000000-0000-0000-0000-000000000001', 'Demo Owner', 'demo@siparisasistani.com', '05320000000',
  'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'owner', true
where not exists (select 1 from users where email = 'demo@siparisasistani.com');

-- ===== 024_marketing_v1.sql =====

-- Marketing v1 — birthday column + notification type
alter table customers add column if not exists birth_date date;

-- birthday discount settings for tenant_settings
alter table tenant_settings add column if not exists birthday_discount_type text not null default 'percent';
alter table tenant_settings add column if not exists birthday_discount_value numeric(5,2) default 10;
alter table tenant_settings add column if not exists birthday_message_template text;

-- ===== 025_fatura_modulu.sql =====

-- Invoice module — company name for customers
alter table customers add column if not exists company_name text;

-- ===== 030_saas_management.sql =====

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
