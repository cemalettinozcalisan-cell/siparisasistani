-- ============================================================
-- SiparişAsistanı - CRM Timeline + Order Status (DÜZELTİLMİŞ)
-- ============================================================

-- Mevcut enum'a yeni değerler ekle (sadece ekleme yapabiliriz)
alter type order_status add value if not exists 'PAYMENT_WAITING' after 'new';
alter type order_status add value if not exists 'PAYMENT_CONFIRMED' after 'PAYMENT_WAITING';
alter type order_status add value if not exists 'PACKAGING' after 'PAYMENT_CONFIRMED';
alter type order_status add value if not exists 'PACKAGED' after 'PACKAGING';
alter type order_status add value if not exists 'DELIVERED' after 'shipped';

-- activity_logs'a channel ve event_icon alanı ekle
alter table activity_logs add column if not exists channel text
  check (channel in ('VOICE','WHATSAPP','WEB','PANEL','SYSTEM'));
alter table activity_logs add column if not exists event_icon text;
