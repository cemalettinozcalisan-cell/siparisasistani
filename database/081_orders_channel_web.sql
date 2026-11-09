-- 081: Web sitesi siparişleri için order_channel enum'una 'web' ekle
-- Supabase SQL Editor'de çalıştırın. (ALTER TYPE ADD VALUE tek başına çalıştırılmalı.)

ALTER TYPE order_channel ADD VALUE IF NOT EXISTS 'web';
