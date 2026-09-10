-- ============================================================
-- SiparişAsistanı - 059: Sertifikalar (opsiyonel)
-- Esnaf Helal/Kosher/BRCGS/ISO vb. sertifikalarını girebilir;
-- AI bu bilgiyi YALNIZCA girilmişse kullanır, girilmemişse iddia etmez.
-- ============================================================
alter table tenants add column if not exists certificates jsonb not null default '[]';