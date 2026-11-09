# SiparisAsistani — Ajan Notları

- Web sitesi sipariş/entegrasyon sorularında **`docs/web-siparis-entegrasyonu.md`** dosyasını oku; oradaki kararlar geçerlidir. Eski/alternatif plan uydurma.
- Webhook testi için `scripts/webhook-test.ps1` kullanılır; çalışma dizini `C:\SiparisAsistani` olmalı veya mutlak yol verilmelidir.
- Telefon/LiveKit pipeline ve TTS/STT ayarları ayrıdır; metin kanalı değişikliklerinde telefon hattını bozma.
- Canlıya geçişte `TEXT_TEST_RESET_NO_MEMORY=false` olmalı; secret/test/update-cancel tamamlanmadan web entegrasyonu "hazır" sayılmaz.
