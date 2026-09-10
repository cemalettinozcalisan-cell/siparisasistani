-- ============================================================
-- SiparişAsistanı - 060: AI Çalışanım (tenant_ai_employee)
-- Esnaf tarafındaki sesli dijital çalışanın kalıcı konfigürasyonu.
-- Realtime session kapanabilir; bu config kalıcıdır.
-- ============================================================
create table if not exists tenant_ai_employee (
  tenant_id                     uuid primary key references tenants(id) on delete cascade,
  name                          text not null default 'Bilge',
  gender                        text not null default 'female',   -- female | male
  voice                         text,
  tone                          text not null default 'samimi',   -- samimi | profesyonel | kisa_net
  salutation                    text not null default 'patron',   -- patron | usta | bey | hanim | abi | kardesim | ozel
  custom_salutation             text,                              -- özel hitap örn. 'İsmail Bey'
  wake_word                     text not null default 'bilge',
  enabled                       boolean not null default true,
  notification_preferences      jsonb not null default '{"order_voice":true,"request_voice":true,"complaint_voice":true,"subscription_voice":true,"stock_voice":true}',
  daily_realtime_budget_min     integer not null default 20,
  monthly_realtime_budget_min   integer,
  quiet_hours_start             text,                              -- '20:00'
  quiet_hours_end               text,                              -- '08:00'
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

-- Kullanım metrikleri (4a kararı için tenant bazında log)
create table if not exists ai_employee_usage (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  kind          text not null,                -- notification_tts | conversation
  duration_sec  integer not null default 0,
  cost_estimate numeric(12,4) not null default 0,
  note          text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_ai_usage_tenant on ai_employee_usage(tenant_id, created_at desc);