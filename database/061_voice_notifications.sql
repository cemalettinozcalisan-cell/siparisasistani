-- ============================================================
-- SiparişAsistanı - 061: AI Çalışanım sesli bildirim kuyruğu
-- Event'ler → pending → delivered → acknowledged (reconnect'ta tekrar seslendirilmez)
-- ============================================================
create table if not exists ai_voice_notifications (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  event_type      text not null,
  entity_id       text,
  dedup_key       text,
  voice_text      text not null,
  priority        integer not null default 5,
  status          text not null default 'pending',   -- pending | delivered | acknowledged | resolved
  created_at      timestamptz not null default now(),
  delivered_at    timestamptz,
  acknowledged_at timestamptz
);

create index if not exists idx_voice_notif_pending on ai_voice_notifications(tenant_id, status, created_at);

-- Aynı olayın iki kez kuyruğa düşmesini engelle (idempotency)
create unique index if not exists uq_voice_notif_dedup on ai_voice_notifications(dedup_key) where dedup_key is not null;

-- RLS: yalnızca service_role erişir (anon/authenticated deny) — uygulama service key kullanır, bozulmaz.
alter table ai_voice_notifications enable row level security;