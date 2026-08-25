-- ============================================================
-- SiparişAsistanı - Faz 6: Akıllı Destek Asistanı (Chatbot + Telefon)
-- Esnaf, sistem hakkında soru sorabilir (rehberden + canlı veriden).
-- Telefon: owner destek hattı (support_phone) ayrı çalışır.
-- ============================================================

-- 1) support_knowledge - kapsamlı kullanım rehberi dokümanı (tek satır)
create table if not exists support_knowledge (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default 'SiparişAsistanı Kullanım Rehberi',
  content     text not null,          -- kapsamlı markdown rehber
  version     integer not null default 1,
  updated_at  timestamptz not null default now(),
  constraint support_knowledge_single_row check (id = '00000000-0000-0000-0000-000000000098')
);

insert into support_knowledge (id, title, content)
values ('00000000-0000-0000-0000-000000000098', 'SiparişAsistanı Kullanım Rehberi', '')
on conflict (id) do nothing;

-- 2) support_chat_sessions - esnaf sohbet oturumları (başlık + tarih)
create table if not exists support_chat_sessions (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  title         text,                 -- AI otomatik oluşturur
  channel       text not null default 'chat', -- chat | phone
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_support_chat_sessions_tenant on support_chat_sessions(tenant_id, updated_at desc);

-- 3) support_chat_messages - sohbet mesajları
create table if not exists support_chat_messages (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references support_chat_sessions(id) on delete cascade,
  sender        text not null default 'user', -- user | ai
  body          text not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_support_chat_messages_session on support_chat_messages(session_id, created_at asc);

-- 4) admin_alert_settings'e owner destek hattı numarası
alter table admin_alert_settings add column if not exists support_phone text;

-- 5) RLS - tenant izolasyonu (support_knowledge global - RLS yok)
alter table support_chat_sessions enable row level security;
alter table support_chat_messages enable row level security;

drop policy if exists tenant_isolation_support_chat_sessions on support_chat_sessions;
create policy tenant_isolation_support_chat_sessions on support_chat_sessions
  for all using (tenant_id = auth.uid()::uuid);

drop policy if exists tenant_isolation_support_chat_messages on support_chat_messages;
create policy tenant_isolation_support_chat_messages on support_chat_messages
  for all using (
    exists (
      select 1 from support_chat_sessions s
      where s.id = support_chat_messages.session_id
        and s.tenant_id = auth.uid()::uuid
    )
  );
