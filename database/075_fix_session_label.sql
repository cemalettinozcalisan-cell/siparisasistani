-- 075: Fix generate_session_label()
-- Eski fonksiyon `split_part(session_label, '-', 2)` (yani TARIHI) aliyordu;
-- ayni gunun 2. oturumundan sonra ayni etiketi uretip `idx_conv_sessions_label`
-- unique index'ini ihlal ediyordu ("duplicate key value violates unique constraint").
--
-- Cozum: race-safe sequence + dogru format (SESSION-YYYYMMDD-0000000).
-- Trigger (trg_conv_sessions_label) zaten bu fonksiyonu cagiriyor; ekstra degisiklik gerekmez.

create sequence if not exists conv_sessions_label_seq start with 1000000;

create or replace function generate_session_label()
returns text language plpgsql as $$
declare
  date_part text := to_char(now(), 'YYYYMMDD');
  seq_num bigint;
begin
  seq_num := nextval('conv_sessions_label_seq');
  return 'SESSION-' || date_part || '-' || lpad(seq_num::text, 7, '0');
end;
$$;
