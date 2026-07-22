-- ============================================================
-- SiparişAsistanı - CRM Timeline + Order Status
-- ============================================================

-- Drop old check constraint and create new one
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in (
    'NEW','PAYMENT_WAITING','PAYMENT_CONFIRMED',
    'PACKAGING','PACKAGED','SHIPPED','DELIVERED',
    'COMPLETED','CANCELLED'
  ));

-- activity_logs'a channel alanı ekle
alter table activity_logs add column if not exists channel text
  check (channel in ('VOICE','WHATSAPP','WEB','PANEL','SYSTEM'));
alter table activity_logs add column if not exists event_icon text;
