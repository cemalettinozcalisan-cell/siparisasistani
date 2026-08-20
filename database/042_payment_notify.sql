-- ============================================================
-- SiparişAsistanı - Ödeme Bazlı Esnaf Bildirimi
--
-- Ön ödemeli siparişlerde (IBAN/link) esnaf bildirimi (panel +
-- WhatsApp grubu + yazıcı) ödeme onayına kadar bekletilir.
--
-- orders.payment_status yeni ara değerler:
--   awaiting_dekont  -> IBAN siparişi, müşteriden dekont bekleniyor
--   dekont_alindi    -> Dekont alındı, esnaf onayı bekleniyor
--   paid             -> Ödeme kesinleşti (dekont onayı / link onayı / teslimat)
--
-- orders.payment_note: esnaf fişinde/grup mesajında gösterilen
-- ödeme notu (örn. "Müşteri dekont gönderdi — onay bekliyor").
--
-- UYGULAMA: AŞAĞIDAKİ İKİ ADIMI SIRAYLA, AYRI QUERY'LER OLARAK ÇALIŞTIR.
-- (Supabase SQL Editor tüm satırları tek transaction'da koştuğu için yeni
--  enum değerleri aynı transaction içinde kullanılamaz - 55P04 hatası.)
-- ============================================================

-- ========== ADIM 1: şema (kolon + enum değerleri) ==========
alter table orders add column if not exists payment_note text;

alter type payment_status add value if not exists 'awaiting_dekont';
alter type payment_status add value if not exists 'dekont_alindi';

-- ========== ADIM 2: veri (geriye dönük tutarlılık) ==========
-- Mevcut IBAN siparişlerini "dekont bekleniyor" durumuna çek
-- (ödeme yapılmamış IBAN siparişleri müşteriden dekont bekliyor sayılır).
-- AYRI QUERY OLARAK ÇALIŞTIRIN:
-- update orders
--    set payment_status = 'awaiting_dekont'
--  where payment_method = 'iban'
--    and payment_status = 'waiting'
--    and status not in ('DELIVERED', 'completed', 'cancelled');