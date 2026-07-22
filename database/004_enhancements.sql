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
