-- ============================================================
-- SiparişAsistanı - Golden Voice Rules
-- ============================================================
alter table tenant_settings add column if not exists ai_style text not null default 'yoresel'
  check (ai_style in ('resmi', 'samimi', 'yoresel'));
