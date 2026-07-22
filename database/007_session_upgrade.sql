-- ============================================================
-- SiparişAsistanı - Session + Provider İyileştirmeleri
-- ============================================================

-- 1) conversation_sessions geliştirme
alter table conversation_sessions add column if not exists channel_source text;
alter table conversation_sessions add column if not exists provider text;
alter table conversation_sessions add column if not exists session_label text;
alter table conversation_sessions add column if not exists duration_seconds integer;
alter table conversation_sessions add column if not exists ai_model text;
alter table conversation_sessions add column if not exists end_reason text;
alter table conversation_sessions add column if not exists retry_count integer not null default 0;
alter table conversation_sessions add column if not exists language text not null default 'tr';

-- session_label için unique index (okunabilir ID)
create unique index if not exists idx_conv_sessions_label on conversation_sessions(session_label);

-- 2) Session label üreteci fonksiyonu
create or replace function generate_session_label()
returns text language plpgsql as $$
declare
  date_part text;
  seq_num integer;
  label text;
begin
  date_part := to_char(now(), 'YYYYMMDD');
  select coalesce(max(split_part(session_label, '-', 2)::integer), 0) + 1
    into seq_num
    from conversation_sessions
   where session_label like 'SESSION-' || date_part || '-%';
  label := 'SESSION-' || date_part || '-' || lpad(seq_num::text, 6, '0');
  return label;
end;
$$;

-- 3) trigger: session oluşurken label otomatik üretilsin
create or replace function trg_set_session_label()
returns trigger language plpgsql as $$
begin
  if new.session_label is null then
    new.session_label := generate_session_label();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_conv_sessions_label on conversation_sessions;
create trigger trg_conv_sessions_label before insert on conversation_sessions
  for each row execute function trg_set_session_label();
