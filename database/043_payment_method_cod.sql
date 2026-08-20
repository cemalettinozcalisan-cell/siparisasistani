-- ============================================================
-- SiparişAsistanı - Kapıda Ödeme Yöntemleri
--
-- orders.payment_method enum'una kapıda tahsilat yöntemleri eklenir:
--   cod          -> Kapıda Nakit (kargo teslimatında tahsil edilir)
--   kapida_kart  -> Kapıda Kredi Kartı (kargo teslimatında tahsil edilir)
--
-- Böylece "Kargo Tahsilatlı" ciro (Kapıda Nakit / Kapıda K.Kartı)
-- ön ödemeli (IBAN/link) cirodan ayrı raporlanabilir.
--
-- UYGULAMA: Supabase SQL Editor'da aşağıdaki sorguyu çalıştır.
-- ============================================================

alter type payment_method add value if not exists 'cod';
alter type payment_method add value if not exists 'kapida_kart';