-- ============================================================
-- SiparişAsistanı - Faz B/C: Recovery Log + KVKK Saklama
-- Faz B: restore testi sonuçları (recovery_logs)
-- Faz C: transcript/mesaj/aktivite saklama süreleri (10y/10y/5y)
-- ============================================================

-- 1) recovery_logs - restore testi denetim kaydı
create table if not exists recovery_logs (
  id            uuid primary key default gen_random_uuid(),
  backup_file   text,
  type          text not null default 'restore_test',
  status        text not null default 'pending', -- success | failed
  summary       jsonb,
  result        jsonb,
  ran_at        timestamptz not null default now()
);

create index if not exists idx_recovery_logs_ran on recovery_logs(ran_at desc);

-- 2) KVKK saklama süreleri (Faz C)
alter table tenant_settings add column if not exists transcript_retention_days integer not null default 3650;
alter table tenant_settings add column if not exists message_retention_days integer not null default 3650;
alter table tenant_settings add column if not exists activity_log_retention_days integer not null default 1825;
