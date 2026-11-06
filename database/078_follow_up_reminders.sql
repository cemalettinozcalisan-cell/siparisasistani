-- 078: Tamamlanmayan sipariş hatırlatmaları (10 dk + 2 saat, en fazla 2)
create table if not exists follow_up_reminders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  session_id uuid not null,
  stage int not null check (stage in (1, 2)),
  last_activity_at timestamptz,
  sent_at timestamptz not null default now(),
  unique (session_id, stage)
);

create index if not exists idx_follow_up_session
  on follow_up_reminders(session_id, stage);
