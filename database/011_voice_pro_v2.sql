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
