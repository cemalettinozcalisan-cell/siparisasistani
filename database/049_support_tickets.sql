-- ============================================================
-- SiparişAsistanı - Faz 2: Esnaf Destek / Ticket Sistemi (2A)
-- Müşteri şikayetinden (complaints) ayrı: esnafın teknik desteği.
-- 100 esnafa çıkınca günde 20-50 destek talebi yönetilebilir.
-- ============================================================

-- 1) support_tickets - esnaf destek bileti (müşteri şikayeti DEĞİL)
create table if not exists support_tickets (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  ticket_number  text,
  subject        text not null,
  category       text not null default 'other', -- telefon | whatsapp | instagram | sms | ai | siparis | odeme | kurulum | fatura | diger | other
  description    text,
  status         text not null default 'open',  -- open | investigating | resolved | closed
  priority       text not null default 'medium',-- low | medium | high | urgent
  ai_diagnosis   text,                          -- 2B: AI destek ön-tanısı sonucu
  ai_diagnosed   boolean not null default false,
  created_by     text not null default 'staff', -- staff | ai
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  resolved_at    timestamptz
);

create index if not exists idx_support_tickets_tenant on support_tickets(tenant_id, created_at desc);
create index if not exists idx_support_tickets_status on support_tickets(status);

-- 2) support_ticket_messages - bilet üzerindeki yazışmalar
create table if not exists support_ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references support_tickets(id) on delete cascade,
  sender      text not null default 'staff',  -- staff | ai | support_agent
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_support_messages_ticket on support_ticket_messages(ticket_id, created_at asc);

-- 3) RLS - tenant izolasyonu
alter table support_tickets enable row level security;
alter table support_ticket_messages enable row level security;

drop policy if exists tenant_isolation_support_tickets on support_tickets;
create policy tenant_isolation_support_tickets on support_tickets
  for all using (tenant_id = auth.uid()::uuid);

drop policy if exists tenant_isolation_support_messages on support_ticket_messages;
create policy tenant_isolation_support_messages on support_ticket_messages
  for all using (
    exists (
      select 1 from support_tickets t
      where t.id = support_ticket_messages.ticket_id
        and t.tenant_id = auth.uid()::uuid
    )
  );
