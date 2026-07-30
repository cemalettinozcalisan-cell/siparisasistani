-- v1.3 Ticari Operasyon

-- 1. Cari Hesap için müşteri bakiyesi
alter table customers add column if not exists balance numeric(12,2) not null default 0;
alter table customers add column if not exists credit_limit numeric(12,2) default 0;
alter table customers add column if not exists payment_term int default 0; -- 0=pesin, 30=30gun, 60, 90

-- 2. Minimum sipariş adedi
alter table products add column if not exists min_order_qty numeric(10,2) default 0;
alter table products add column if not exists wholesale_price numeric(12,2); -- toptan fiyat (opsiyonel)

-- 3. Satış tiplerine Tepsi/Palet ekle (enum degil text array)
-- products.sale_types zaten jsonb/text[] oldugu icin ekstra islem gerekmez

-- 4. Müşteri bazlı özel fiyat listesi
create table if not exists customer_prices (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  customer_id       uuid not null references customers(id) on delete cascade,
  product_id        uuid references products(id) on delete cascade,
  product_name      text not null,
  unit              text not null default 'KG',
  price             numeric(12,2) not null,
  min_quantity      numeric(10,2) default 0,
  valid_from        date,
  valid_until       date,
  created_at        timestamptz not null default now(),
  unique(tenant_id, customer_id, product_id, unit)
);

-- 5. Cari hesap hareketleri
create table if not exists account_transactions (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  customer_id       uuid not null references customers(id) on delete cascade,
  type              text not null check (type in ('invoice', 'payment', 'refund', 'credit', 'debit')),
  amount            numeric(12,2) not null,
  balance_after     numeric(12,2) not null,
  reference_id      text, -- order_id veya payment_id
  description       text,
  due_date          date,
  created_at        timestamptz not null default now()
);

-- 6. Siparişe vade bilgisi
alter table orders add column if not exists payment_term int default 0;
alter table orders add column if not exists due_date date;
