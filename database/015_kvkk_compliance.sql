-- KVKK Compliance: data retention and privacy

-- Tenant-level retention settings
alter table tenant_settings add column if not exists recording_retention_days integer not null default 90;
alter table tenant_settings add column if not exists audit_log_retention_days integer not null default 365;
alter table tenant_settings add column if not exists auto_cleanup_enabled boolean not null default false;

-- Index for cleanup queries
create index if not exists idx_call_recordings_created_at on call_recordings(created_at);
create index if not exists idx_ai_audit_logs_created_at on ai_audit_logs(created_at);
create index if not exists idx_activity_logs_created_at on activity_logs(created_at);
create index if not exists idx_instagram_messages_created_at on instagram_messages(created_at);
