-- ============================================================
-- SiparişAsistanı - Faz 3: Tenant İzolasyonu / RLS (3A)
-- 100 esnaf aynı Supabase'de iken, bir esnafın verisi diğerine
-- düşmesin. Tenant-scoped tablolara eksik RLS policy'lerini ekler.
-- (Yeni eklenen channel_health / webhook_events / support_tickets
--  migration'larında zaten RLS mevcuttur.)
-- ============================================================

-- api_keys — API anahtarları en kritik; kesin izolasyon
alter table api_keys enable row level security;
drop policy if exists tenant_isolation_api_keys on api_keys;
create policy tenant_isolation_api_keys on api_keys
  for all using (tenant_id = auth.uid()::uuid);

-- customer_prices — müşteri özel fiyatları
alter table customer_prices enable row level security;
drop policy if exists tenant_isolation_customer_prices on customer_prices;
create policy tenant_isolation_customer_prices on customer_prices
  for all using (tenant_id = auth.uid()::uuid);

-- instagram_conversations / instagram_messages — müşteri DM verisi
alter table instagram_conversations enable row level security;
drop policy if exists tenant_isolation_instagram_conversations on instagram_conversations;
create policy tenant_isolation_instagram_conversations on instagram_conversations
  for all using (tenant_id = auth.uid()::uuid);

alter table instagram_messages enable row level security;
drop policy if exists tenant_isolation_instagram_messages on instagram_messages;
create policy tenant_isolation_instagram_messages on instagram_messages
  for all using (
    tenant_id = auth.uid()::uuid
    or exists (
      select 1 from instagram_conversations c
      where c.id = instagram_messages.conversation_id
        and c.tenant_id = auth.uid()::uuid
    )
  );

-- webhook_configs — web sitesi entegrasyon anahtarları
alter table webhook_configs enable row level security;
drop policy if exists tenant_isolation_webhook_configs on webhook_configs;
create policy tenant_isolation_webhook_configs on webhook_configs
  for all using (tenant_id = auth.uid()::uuid);

-- sales_campaigns / campaign_logs — pazarlama kampanyaları
alter table sales_campaigns enable row level security;
drop policy if exists tenant_isolation_sales_campaigns on sales_campaigns;
create policy tenant_isolation_sales_campaigns on sales_campaigns
  for all using (tenant_id = auth.uid()::uuid);

alter table campaign_logs enable row level security;
drop policy if exists tenant_isolation_campaign_logs on campaign_logs;
create policy tenant_isolation_campaign_logs on campaign_logs
  for all using (
    tenant_id = auth.uid()::uuid
    or exists (
      select 1 from sales_campaigns s
      where s.id = campaign_logs.campaign_id
        and s.tenant_id = auth.uid()::uuid
    )
  );

-- account_transactions — cari hesap hareketleri
alter table account_transactions enable row level security;
drop policy if exists tenant_isolation_account_transactions on account_transactions;
create policy tenant_isolation_account_transactions on account_transactions
  for all using (tenant_id = auth.uid()::uuid);
