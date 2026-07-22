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
