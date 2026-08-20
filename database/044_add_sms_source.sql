-- SMS kaynakli siparisler icin source check constraint'ine SMS ekle
alter table orders drop constraint if exists orders_source_check;
alter table orders add constraint orders_source_check
  check (source in ('PHONE', 'WHATSAPP', 'INSTAGRAM', 'WEBSITE', 'MANUAL', 'WHOLESALE', 'SMS'));