-- 077: Havale/IBAN dekont hatırlatması
-- 3 saat sonra ödenmemiş (dekont bekleyen) siparişler için tek sefer hatırlatma.

alter table orders
  add column if not exists dekont_reminder_sent_at timestamptz;

create index if not exists idx_orders_dekont_reminder
  on orders(payment_status, created_at)
  where payment_status = 'awaiting_dekont';
