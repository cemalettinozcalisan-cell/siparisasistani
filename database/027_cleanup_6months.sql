-- 6 aylık görüşme otomatik temizliği
-- Supabase pg_cron ile periyodik çalıştırmak için

-- conversation_sessions (6 aydan eski)
delete from conversation_sessions where created_at < now() - interval '6 months';

-- ai_audit_logs (6 aydan eski)
delete from ai_audit_logs where created_at < now() - interval '6 months';

-- Supabase'te pg_cron ile ayda bir otomatik çalıştırmak için:
-- select cron.schedule('cleanup-old-conversations', '0 3 1 * *', $$
--   delete from conversation_sessions where created_at < now() - interval '6 months';
--   delete from ai_audit_logs where created_at < now() - interval '6 months';
-- $$);
