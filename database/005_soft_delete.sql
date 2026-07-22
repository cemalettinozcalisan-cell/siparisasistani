-- ============================================================
-- SiparişAsistanı - Soft Delete (v1.0)
-- ============================================================

-- Tüm tablolara deleted_at alanı ekle
-- Hiçbir tabloda gerçek DELETE yok, hepsi soft delete

alter table tenants add column if not exists deleted_at timestamptz;
alter table users add column if not exists deleted_at timestamptz;
alter table products add column if not exists deleted_at timestamptz;
alter table customers add column if not exists deleted_at timestamptz;
alter table orders add column if not exists deleted_at timestamptz;
alter table order_items add column if not exists deleted_at timestamptz;
alter table calls add column if not exists deleted_at timestamptz;
alter table whatsapp_messages add column if not exists deleted_at timestamptz;
alter table whatsapp_conversations add column if not exists deleted_at timestamptz;
alter table notifications add column if not exists deleted_at timestamptz;
alter table call_sessions add column if not exists deleted_at timestamptz;
alter table print_jobs add column if not exists deleted_at timestamptz;
alter table shipments add column if not exists deleted_at timestamptz;
alter table payments add column if not exists deleted_at timestamptz;
alter table knowledge_articles add column if not exists deleted_at timestamptz;

-- ORDER tablosuna müşteri notu ekle (Conversation Replay için)
alter table orders add column if not exists customer_note text;
alter table orders add column if not exists ai_transcript text;
alter table orders add column if not exists ai_confidence integer;
