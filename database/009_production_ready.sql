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
