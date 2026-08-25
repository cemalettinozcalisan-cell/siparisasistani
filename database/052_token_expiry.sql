-- ============================================================
-- SiparişAsistanı - Faz 3: API Anahtar Ömür İzleme (3C)
-- Instagram/WhatsApp token'ları zamanla süresi dolunca "dün çalışıyordu
-- bugün çalışmıyor" şikayetlerine yol açar. Süre dolmadan önce uyarır.
-- ============================================================

alter table api_keys add column if not exists expires_at timestamptz;
alter table api_keys add column if not exists expires_at_known boolean not null default false;
