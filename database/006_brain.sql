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
