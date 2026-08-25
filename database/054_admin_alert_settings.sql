-- ============================================================
-- SiparişAsistanı - Faz 4: Owner Arıza Bildirim Ayarları
-- Owner (yönetici) e-posta + WhatsApp + SMS ile dış arıza bildirimi
-- alır. İletişim bilgileri panelden değiştirilebilir (kod/dağıtım
-- gerekmez). Toplulaştırma eşiği varsayılan 2, panelden değiştirilebilir.
-- ============================================================

create table if not exists admin_alert_settings (
  id                    uuid primary key default gen_random_uuid(),
  owner_email           text,
  whatsapp_phone        text,
  sms_phone             text,
  email_enabled         boolean not null default false,
  whatsapp_enabled      boolean not null default false,
  sms_enabled           boolean not null default false,
  aggregation_threshold integer not null default 2,
  aggregation_window_min integer not null default 5,
  updated_at            timestamptz not null default now(),
  constraint admin_alert_settings_single_row check (id = '00000000-0000-0000-0000-000000000099')
);

-- channel_health_alerts'e harici bildirim durumu (cron taraması için)
alter table channel_health_alerts add column if not exists external_notified boolean not null default false;

-- Varsayılan tek satır (boş, doldurulmayı bekler)
insert into admin_alert_settings (id)
values ('00000000-0000-0000-0000-000000000099')
on conflict (id) do nothing;
