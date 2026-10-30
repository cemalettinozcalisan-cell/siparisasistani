-- 071: Order-AI çağrı sonucu statüleri (abandoned / no_confirm)
-- Sipariş oluşmadan/onaylanmadan kapanan telefon çağrıları da conversation_sessions'a yazılır.
alter table conversation_sessions drop constraint if exists conversation_sessions_status_check;
alter table conversation_sessions add constraint conversation_sessions_status_check
  check (status in ('active', 'completed', 'transferred', 'failed', 'abandoned', 'no_confirm'));
