-- ============================================================
-- SiparişAsistanı - 063: Abonelik eşik takibi (AI Çalışanım sesli uyarı)
-- Kalan sipariş hakkı 30/20/10/5'e düştüğünde bir kez sesli bildirim (SUBSCRIPTION_THRESHOLD)
-- ============================================================
alter table subscriptions add column if not exists last_threshold_notified integer;