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
