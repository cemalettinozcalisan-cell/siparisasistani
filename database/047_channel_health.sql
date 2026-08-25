-- ============================================================
-- SiparişAsistanı - Faz 1: Kanal Sağlık İzleme (1A + 1B)
-- Her tenant'ın her dış kanalının (NetGSM/SMS/WhatsApp/Instagram/Web)
-- son başarı ve hata durumunu izler; proaktif arıza tespiti + per-esnaf
-- kanal sağlık ekranı için altyapı.
-- ============================================================

-- 1) channel_health - tenant + channel bazında son durum (tekil satır)
create table if not exists channel_health (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenants(id) on delete cascade,
  channel            text not null,             -- phone | sms | whatsapp | instagram | website | ai | webhook
  status             text not null default 'unknown', -- unknown | ok | degraded | down
  last_success_at    timestamptz,
  last_error_at      timestamptz,
  last_error         text,
  last_error_code    text,
  error_count        integer not null default 0,  -- eşik izleyici için kayan pencere sayacı
  success_count_1h   integer not null default 0,
  error_count_1h     integer not null default 0,
  last_success_1h_at timestamptz,
  last_error_1h_at   timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (tenant_id, channel)
);

create index if not exists idx_channel_health_tenant on channel_health(tenant_id);
create index if not exists idx_channel_health_status on channel_health(status);

-- 2) channel_health_events - her olay için denetim kaydı (son 1 saat istatistiği için)
create table if not exists channel_health_events (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  channel         text not null,
  ok              boolean not null,
  error           text,
  error_code      text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_channel_health_events_tenant on channel_health_events(tenant_id, channel, created_at desc);

-- 3) channel_health_alerts - eşik aşılınca tetiklenen uyarılar (tekrar bildirimi engellemek için)
create table if not exists channel_health_alerts (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  channel      text not null,
  alert_type   text not null default 'degraded', -- degraded | down | recovered
  message      text,
  fired_at     timestamptz not null default now(),
  resolved_at  timestamptz
);

create index if not exists idx_channel_health_alerts_tenant on channel_health_alerts(tenant_id, channel, fired_at desc);

-- 4) RLS - tenant izolasyonu
alter table channel_health enable row level security;
alter table channel_health_events enable row level security;
alter table channel_health_alerts enable row level security;

drop policy if exists tenant_isolation_channel_health on channel_health;
create policy tenant_isolation_channel_health on channel_health
  for all using (tenant_id = auth.uid()::uuid);

drop policy if exists tenant_isolation_channel_health_events on channel_health_events;
create policy tenant_isolation_channel_health_events on channel_health_events
  for all using (tenant_id = auth.uid()::uuid);

drop policy if exists tenant_isolation_channel_health_alerts on channel_health_alerts;
create policy tenant_isolation_channel_health_alerts on channel_health_alerts
  for all using (tenant_id = auth.uid()::uuid);
