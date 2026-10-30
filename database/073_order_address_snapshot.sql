-- 073: Sipariş adres/il/ilçe snapshot (paylaşılan müşteri kaydından bağımsız)
alter table orders add column if not exists customer_address text;
alter table orders add column if not exists customer_city text;
alter table orders add column if not exists customer_district text;

-- Eski siparişlere mevcut müşteri adres/il bilgisini geriye dönük yaz (varsa)
update orders o set customer_address = c.address, customer_city = c.city
 from customers c
 where o.customer_id = c.id and o.customer_address is null;
