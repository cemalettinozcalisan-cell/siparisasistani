-- Omnichannel: Instagram + Website source types
alter table orders drop constraint if exists orders_source_check;
alter table orders alter column source set default 'PHONE';
update orders set source = 'PHONE' where source is null;
alter table orders add constraint orders_source_check
  check (source in ('PHONE', 'WHATSAPP', 'INSTAGRAM', 'WEBSITE', 'MANUAL', 'WHOLESALE'));

-- Instagram conversations
create table if not exists instagram_conversations (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  instagram_user_id text not null,
  customer_id       uuid references customers(id) on delete set null,
  username          text,
  status            text not null default 'active',
  last_message_at   timestamptz,
  message_count     integer not null default 0,
  created_at        timestamptz not null default now()
);

-- Instagram messages
create table if not exists instagram_messages (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  conversation_id   uuid references instagram_conversations(id) on delete cascade,
  direction         text not null check (direction in ('incoming', 'outgoing')),
  body              text not null,
  media_url         text,
  created_at        timestamptz not null default now()
);

-- Webhook configuration for web sites
create table if not exists webhook_configs (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  platform          text not null check (platform in ('woocommerce', 'shopify', 'ideasoft', 'ticimax', 'custom')),
  webhook_url       text,
  api_key           text,
  active            boolean not null default false,
  last_sync_at      timestamptz,
  settings          jsonb default '{}',
  created_at        timestamptz not null default now()
);

-- Add source to conversation_sessions
alter table conversation_sessions add column if not exists source text;
alter table conversation_sessions add column if not exists instagram_conversation_id uuid references instagram_conversations(id) on delete set null;

-- Add customer_note to orders
alter table orders add column if not exists customer_note text;
