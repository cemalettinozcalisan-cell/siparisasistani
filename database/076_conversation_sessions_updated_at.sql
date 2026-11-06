-- 076: conversation_sessions.updated_at (son aktivite) + otomatik güncelleme
--
-- Neden: Oturum sürekliliği `created_at` (oturum başlangıcı) üzerinden ölçülüyordu.
-- Uzun konuşmalarda 5 dk dolunca yeni oturum açılıp AI bağlamı kaybediyordu.
-- Ayrıca kod `updated_at` yazmaya çalışıyordu ama kolon olmadığı için güncellemeler
-- sessizce başarısız oluyordu (temiz mesaj geçmişi kaydedilmiyordu).
--
-- Çözüm: updated_at kolonu + her update'te now() yazan trigger.

alter table conversation_sessions
  add column if not exists updated_at timestamptz not null default now();

update conversation_sessions
   set updated_at = coalesce(updated_at, created_at, now())
 where updated_at is null;

create or replace function trg_touch_conversation_sessions()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_conv_sessions on conversation_sessions;
create trigger trg_touch_conv_sessions
  before update on conversation_sessions
  for each row execute function trg_touch_conversation_sessions();

-- Sorgu hızı için
create index if not exists idx_conv_sessions_updated on conversation_sessions(tenant_id, updated_at desc);
