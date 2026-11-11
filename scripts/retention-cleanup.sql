-- ============================================================
-- SiparisAsistani - Retention temizligi (MANUEL)
-- UYARI: Once yedek alin. Bu script varsayilan olarak CALISTIRILMAMALIDIR.
-- 20 Kasim reset sonrasi inceleyip uygulayin.
-- ============================================================

-- 0) Etkilenecek satirlari once gor (dry-run)
select 'ai_audit_logs' as tablo, count(*) from ai_audit_logs where created_at < now() - interval '90 days'
union all
select 'conversation_sessions', count(*) from conversation_sessions
  where status in ('completed', 'failed') and created_at < now() - interval '180 days'
union all
select 'whatsapp_messages', count(*) from whatsapp_messages where created_at < now() - interval '180 days'
union all
select 'outbound_logs', count(*) from outbound_logs where created_at < now() - interval '90 days'
union all
select 'activity_logs', count(*) from activity_logs where created_at < now() - interval '180 days'
union all
select 'notifications', count(*) from notifications where created_at < now() - interval '90 days'
union all
select 'ai_voice_notifications', count(*) from ai_voice_notifications where created_at < now() - interval '30 days'
union all
select 'channel_health', count(*) from channel_health where created_at < now() - interval '30 days'
union all
select 'print_jobs', count(*) from print_jobs where created_at < now() - interval '90 days'
union all
select 'webhook_events', count(*) from webhook_events where created_at < now() - interval '30 days'
union all
select 'follow_up_reminders', count(*) from follow_up_reminders where created_at < now() - interval '180 days'
union all
select 'call_sessions', count(*) from call_sessions where created_at < now() - interval '180 days';

-- 1) Temizlik (yalnizca dry-run sonucu onaylandiysa)
begin;

-- Aktif oturumlar ve son 24 saat korunur.
delete from ai_audit_logs
where created_at < now() - interval '90 days'
  and session_id not in (select id from conversation_sessions where status = 'active');

delete from follow_up_reminders
where created_at < now() - interval '180 days';

delete from conversation_sessions
where status in ('completed', 'failed')
  and created_at < now() - interval '180 days';

delete from whatsapp_messages
where created_at < now() - interval '180 days';

delete from outbound_logs
where created_at < now() - interval '90 days';

delete from activity_logs
where created_at < now() - interval '180 days';

delete from notifications
where created_at < now() - interval '90 days';

delete from ai_voice_notifications
where created_at < now() - interval '30 days';

delete from channel_health
where created_at < now() - interval '30 days';

delete from print_jobs
where created_at < now() - interval '90 days';

-- Dedup: son 30 gun korunmali.
delete from webhook_events
where created_at < now() - interval '30 days';

delete from call_recordings
where created_at < now() - interval '180 days';

delete from call_sessions
where created_at < now() - interval '180 days';

commit;

-- Not: call_recordings silindiyse Storage'daki ses dosyalari ayrica silinmelidir.
-- Not: orders/order_items/payments/customers otomatik silinmez.
