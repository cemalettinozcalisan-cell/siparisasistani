-- Demo conversation data for tenant 00000000-0000-0000-0000-000000000001
do $$
declare
  v_tid uuid := '00000000-0000-0000-0000-000000000001';
  v_sid uuid;
  i int;
begin
  for i in 1..5 loop
    v_sid := gen_random_uuid();
    insert into conversation_sessions (id, tenant_id, channel, channel_source, phone, status, call_status, session_label, call_duration, ai_model, created_at, ended_at)
    values (v_sid, v_tid, 'phone', 'netgsm',
      case when i % 2 = 0 then '05321234567' else '05339876543' end,
      'completed', 'COMPLETED',
      'SESSION-20260722-' || lpad(i::text, 4, '0'),
      120 + i * 30, 'deepseek-chat',
      now() - (i * 2 * interval '1 hour'),
      now() - (i * 2 * interval '1 hour') + interval '3 minutes')
    on conflict (id) do nothing;
  end loop;
end $$;
