-- ============================================================
-- SiparişAsistanı - Faz 0: Outbound Messaging Engine
-- Gerçek gönderim motoru (SMS/WhatsApp/Instagram/Grup) + İYS + WhatsApp şablonları
-- ============================================================

-- 1) outbound_logs - tüm kanalların teslimat kanıtı (KVKK/denetim)
create table if not exists outbound_logs (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  channel               text not null,            -- sms | whatsapp | instagram | whatsapp_group
  direction             text not null default 'outgoing',
  recipient             text,
  body                  text,
  status                text not null default 'queued', -- queued|sending|sent|failed|provider_not_configured
  provider              text,
  provider_message_id   text,
  reference_type        text,                      -- order | customer | campaign | system
  reference_id          uuid,
  error_message         text,
  template_id           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_outbound_tenant on outbound_logs(tenant_id);
create index if not exists idx_outbound_status on outbound_logs(status);
create index if not exists idx_outbound_created on outbound_logs(created_at desc);

-- 2) opt_outs - pazarlama izni olmayan / "DUR" diyen müşteriler
create table if not exists opt_outs (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  phone       text not null,
  channel     text not null default 'sms',         -- sms | whatsapp
  source      text not null default 'manual',      -- iys | reply | manual
  created_at  timestamptz not null default now(),
  unique (tenant_id, phone, channel)
);

create index if not exists idx_opt_outs_tenant on opt_outs(tenant_id);

-- 3) whatsapp_templates - Meta onaylı pazarlama şablonları (jenerik + değişken)
create table if not exists whatsapp_templates (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  name             text not null,
  category         text not null default 'MARKETING',
  language         text not null default 'tr',
  body             text not null,                  -- "Sayın {{1}}, {{2}} işletmemizde..."
  variables        jsonb not null default '[]',    -- [{key, label}] değişken tanımları
  status           text not null default 'draft',  -- draft|pending_review|approved|rejected
  meta_template_id text,
  meta_status      text,
  rejection_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_whatsapp_templates_tenant on whatsapp_templates(tenant_id);

-- 4) tenant_settings - WhatsApp / grup / İYS yapılandırması
alter table tenant_settings add column if not exists whatsapp_waba_id text;
alter table tenant_settings add column if not exists whatsapp_group_id text;
alter table tenant_settings add column if not exists iys_enabled boolean not null default false;

-- 5) whatsapp_messages - gönderim durumu takibi için kolonlar
alter table whatsapp_messages add column if not exists retry_count int not null default 0;
alter table whatsapp_messages add column if not exists error_message text;
alter table whatsapp_messages add column if not exists sent_at timestamptz;

-- 6) RLS + policy'ler
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
