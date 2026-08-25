-- ============================================================
-- SiparişAsistanı - Faz 1: Webhook Idempotency (1C)
-- Meta/NetGSM/E-Ticaret webhook'ları retry ettiğinde aynı event'in
-- iki kez işlenmesini (çift sipariş/çift mesaj) engeller.
-- ============================================================

-- 1) webhook_events - işlenen her event için benzersiz iz
create table if not exists webhook_events (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenants(id) on delete cascade,
  provider           text not null,             -- woocommerce | shopify | ideasoft | ticimax | custom | instagram | netgsm | whatsapp
  provider_event_id  text not null,             -- platformun verdiği benzersiz event id
  payload_hash       text,                      -- içerik sağlama toplamı (opsiyonel çift kontrol)
  status             text not null default 'processed', -- processed | duplicate | failed
  created_at         timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists idx_webhook_events_tenant on webhook_events(tenant_id, created_at desc);

-- 2) RLS - tenant izolasyonu
alter table webhook_events enable row level security;

drop policy if exists tenant_isolation_webhook_events on webhook_events;
create policy tenant_isolation_webhook_events on webhook_events
  for all using (tenant_id = auth.uid()::uuid);
