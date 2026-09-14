-- ============================================================
-- SiparişAsistanı - 064: AI Çalışanım uyandırma modları
-- wake_enabled (varsayılan AÇIK): 2 alkış + isim ile uyanma (mikrofon sürekli açık, algılama yerel)
-- push_to_talk_enabled (varsayılan KAPALI): Bas-ve-Konuş butonu
-- ============================================================
alter table tenant_ai_employee add column if not exists wake_enabled boolean not null default true;
alter table tenant_ai_employee add column if not exists push_to_talk_enabled boolean not null default false;