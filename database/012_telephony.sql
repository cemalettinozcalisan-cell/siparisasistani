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
