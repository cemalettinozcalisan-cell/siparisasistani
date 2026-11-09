-- 079: Takip hatırlatmaları için durum kolonları
-- Amaç: müşteri cevap verince 2. hatırlatmayı (ve yeni stage 1'i) kalıcı olarak iptal etmek.
-- Supabase SQL Editor'de çalıştırın.

ALTER TABLE follow_up_reminders
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS cancel_reason text;

COMMENT ON COLUMN follow_up_reminders.status IS 'sent | cancelled';
COMMENT ON COLUMN follow_up_reminders.cancel_reason IS 'customer_replied | manual | ...';
