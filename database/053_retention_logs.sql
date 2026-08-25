-- ============================================================
-- SiparişAsistanı - Faz 3: KVKK Retention Monitor (3D)
-- Otomatik veri silme işlemlerinin denetim kaydı:
-- "30 gün sonra silinir" demek yetmez; ne silindi, ne zaman,
-- kaç kayıt silindi, hata oldu mu görülmeli.
-- ============================================================

create table if not exists retention_logs (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid,                         -- null = global (tüm tenant'lar)
  scope          text not null,                -- recording | transcript | audit_log | activity_log | order | global
  deleted_count  integer not null default 0,
  failed_count   integer not null default 0,
  cutoff         timestamptz,
  message        text,
  ran_at         timestamptz not null default now()
);

create index if not exists idx_retention_logs_ran on retention_logs(ran_at desc);
create index if not exists idx_retention_logs_tenant on retention_logs(tenant_id);
