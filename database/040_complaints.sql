-- ============================================================
-- SiparişAsistanı - Faz 3: Birleşik Şikayet Hattı
-- Tüm kanallardan (telefon, SMS, WhatsApp, Instagram, panel) gelen
-- şikayetlerin tek kayıt tablosu + şikayet fişi için print_jobs tipi
-- ============================================================

-- 1) complaints - birleşik şikayet kaydı (esnaf + KVKK denetimi)
create table if not exists complaints (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  session_id      text,                      -- oturum başına tek şikayet (dedup)
  ticket_number   text,
  channel         text not null default 'phone',  -- phone | sms | whatsapp | instagram | panel
  source          text not null default 'ai',     -- ai | manual | customer
  customer_name   text,
  customer_phone  text,
  category        text not null default 'general',
  severity        text not null default 'medium', -- low | medium | high | critical
  priority        text not null default 'medium', -- low | medium | high
  description     text,
  status          text not null default 'open',   -- open | in_progress | resolved | closed
  order_id        uuid references orders(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_complaints_tenant on complaints(tenant_id);
create index if not exists idx_complaints_status on complaints(tenant_id, status);
create index if not exists idx_complaints_session on complaints(tenant_id, session_id);

-- 2) print_jobs - şikayet fişi tipi (order | complaint)
alter table print_jobs add column if not exists job_type text not null default 'order';
alter table print_jobs add column if not exists payload jsonb;

-- 3) RLS + policy'ler
alter table complaints enable row level security;

drop policy if exists tenant_isolation_complaints on complaints;
create policy tenant_isolation_complaints on complaints
  for all using (tenant_id = auth.uid()::uuid);