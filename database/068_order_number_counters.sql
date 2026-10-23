-- 068: FAZ 5 — Sipariş numarası atomik sayaç (tenant + yıl öneki bazlı)
-- Supabase SQL Editor'da çalıştırın. Idempotent.
create table if not exists order_number_counters (
  tenant_id uuid not null,
  year_prefix text not null,
  last_seq int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, year_prefix)
);

-- Atomik artırma: mevcut değeri +1 yapıp döndürür (race-free).
create or replace function next_order_seq(p_tenant uuid, p_year_prefix text)
returns int
language plpgsql
as $$
declare v_seq int;
begin
  insert into order_number_counters (tenant_id, year_prefix, last_seq)
  values (p_tenant, p_year_prefix, 1)
  on conflict (tenant_id, year_prefix)
  do update set last_seq = order_number_counters.last_seq + 1, updated_at = now()
  returning last_seq into v_seq;
  return v_seq;
end;
$$;

-- Mevcut siparişlerden sayaçları tohumla (yıl öneki başına en büyük sıra).
insert into order_number_counters (tenant_id, year_prefix, last_seq)
select tenant_id, split_part(order_number, '-', 1), max((split_part(order_number, '-', 2))::int)
from orders
where order_number ~ '^[0-9]{2}-[0-9]+$'
group by tenant_id, split_part(order_number, '-', 1)
on conflict (tenant_id, year_prefix)
do update set last_seq = greatest(order_number_counters.last_seq, excluded.last_seq);

-- Güvenlik ağı: aynı tenant'ta aynı sipariş no iki kez olamaz.
create unique index if not exists orders_tenant_order_number_uidx on orders (tenant_id, order_number);
