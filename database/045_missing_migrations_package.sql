-- ============================================================
-- SiparişAsistanı - Eksik Migration Paketi (038+039+040+041+045)
-- NOT: Tüm satırlar idempotent'tir (if not exists). Güvenle çalıştırılır.
-- Supabase SQL Editor'da tamamını kopyala-yapıştır yapıp "Run" basın.
-- ============================================================

-- ============ 038 - Outbound Messaging Engine ============
-- 1) outbound_logs - gönderim kanıtı (KVKK/denetim)
create table if not exists outbound_logs (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  channel               text not null,
  direction             text not null default 'outgoing',
  recipient             text,
  body                  text,
  status                text not null default 'queued',
  provider              text,
  provider_message_id   text,
  reference_type        text,
  reference_id          uuid,
  error_message         text,
  template_id           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_outbound_tenant on outbound_logs(tenant_id);
create index if not exists idx_outbound_status on outbound_logs(status);
create index if not exists idx_outbound_created on outbound_logs(created_at desc);

-- 2) opt_outs - pazarlama izni olmayanlar
create table if not exists opt_outs (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  phone       text not null,
  channel     text not null default 'sms',
  source      text not null default 'manual',
  created_at  timestamptz not null default now(),
  unique (tenant_id, phone, channel)
);
create index if not exists idx_opt_outs_tenant on opt_outs(tenant_id);

-- 3) whatsapp_templates - Meta onaylı şablonlar
create table if not exists whatsapp_templates (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  name             text not null,
  category         text not null default 'MARKETING',
  language         text not null default 'tr',
  body             text not null,
  variables        jsonb not null default '[]',
  status           text not null default 'draft',
  meta_template_id text,
  meta_status      text,
  rejection_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_whatsapp_templates_tenant on whatsapp_templates(tenant_id);

-- 4) tenant_settings - WhatsApp / İYS yapılandırması
alter table tenant_settings add column if not exists whatsapp_waba_id text;
alter table tenant_settings add column if not exists whatsapp_group_id text;
alter table tenant_settings add column if not exists iys_enabled boolean not null default false;

-- 5) whatsapp_messages - gönderim takibi kolonları
alter table whatsapp_messages add column if not exists retry_count int not null default 0;
alter table whatsapp_messages add column if not exists error_message text;
alter table whatsapp_messages add column if not exists sent_at timestamptz;

-- 6) RLS
alter table outbound_logs enable row level security;
alter table opt_outs enable row level security;
alter table whatsapp_templates enable row level security;
drop policy if exists tenant_isolation_outbound_logs on outbound_logs;
create policy tenant_isolation_outbound_logs on outbound_logs
  for all using (tenant_id = auth.uid()::uuid);
drop policy if exists tenant_isolation_opt_outs on opt_outs;
create policy tenant_isolation_opt_outs on opt_outs
  for all using (tenant_id = auth.uid()::uuid);
drop policy if exists tenant_isolation_whatsapp_templates on whatsapp_templates;
create policy tenant_isolation_whatsapp_templates on whatsapp_templates
  for all using (tenant_id = auth.uid()::uuid);

-- ============ 039 - Kargo Entegrasyonları ============
create table if not exists cargo_integrations (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  company      text not null,
  enabled      boolean not null default false,
  api_key      text,
  api_secret   text,
  extra_config jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (tenant_id, company)
);
create index if not exists idx_cargo_integrations_tenant on cargo_integrations(tenant_id);

alter table orders add column if not exists cargo_status text;
alter table orders add column if not exists cargo_status_updated_at timestamptz;

alter table cargo_integrations enable row level security;
drop policy if exists tenant_isolation_cargo_integrations on cargo_integrations;
create policy tenant_isolation_cargo_integrations on cargo_integrations
  for all using (tenant_id = auth.uid()::uuid);

-- ============ 040 - Birleşik Şikayet Hattı ============
create table if not exists complaints (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  session_id      text,
  ticket_number   text,
  channel         text not null default 'phone',
  source          text not null default 'ai',
  customer_name   text,
  customer_phone  text,
  category        text not null default 'general',
  severity        text not null default 'medium',
  priority        text not null default 'medium',
  description     text,
  status          text not null default 'open',
  order_id        uuid references orders(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_complaints_tenant on complaints(tenant_id);
create index if not exists idx_complaints_status on complaints(tenant_id, status);
create index if not exists idx_complaints_session on complaints(tenant_id, session_id);

alter table print_jobs add column if not exists job_type text not null default 'order';
alter table print_jobs add column if not exists payload jsonb;

alter table complaints enable row level security;
drop policy if exists tenant_isolation_complaints on complaints;
create policy tenant_isolation_complaints on complaints
  for all using (tenant_id = auth.uid()::uuid);

-- ============ 041 - Varsayılan Kargo Firması ============
alter table tenant_settings add column if not exists default_cargo_company text;

-- ============ 045 - Eksik İşletme Ayarları ============
-- Onboarding + AI satış koçu bu sütunları kullanıyor; şu an DB'de yok.
alter table tenant_settings add column if not exists sector text;
alter table tenant_settings add column if not exists identity_number text;
alter table tenant_settings add column if not exists tax_office text;
alter table tenant_settings add column if not exists payment_website boolean not null default false;
alter table tenant_settings add column if not exists website_url text;
alter table tenant_settings add column if not exists cargo_default_price numeric(10,2) not null default 0;
alter table tenant_settings add column if not exists cargo_free_enabled boolean not null default false;
alter table tenant_settings add column if not exists cargo_free_type text not null default 'price';
alter table tenant_settings add column if not exists cargo_free_threshold numeric(10,2) not null default 0;
alter table tenant_settings add column if not exists cargo_free_weight numeric(10,2) not null default 0;
alter table tenant_settings add column if not exists cargo_free_quantity integer not null default 0;
alter table tenant_settings add column if not exists invoice_enabled boolean not null default false;
alter table tenant_settings add column if not exists invoice_limit numeric(10,2) not null default 12000;
alter table tenant_settings add column if not exists invoice_ai_behavior text not null default 'sor';
alter table tenant_settings add column if not exists invoice_remote_auto boolean not null default false;
alter table tenant_settings add column if not exists invoice_default_vat numeric(5,2) not null default 20;
alter table tenant_settings add column if not exists invoice_tc_policy text not null default 'istenirse';
alter table tenant_settings add column if not exists invoice_footer_note text;