# AI Çalışanım — Aşama 7 Test Raporu

> Tarih: 2026-09-15 | Kapsam: P7.1–P7.6
> **ÖNEMLİ:** Bu rapor **sentetik teknik doğrulama** içerir. **Gerçek esnaf validasyonu YAPILMAMIŞTIR** (pilot için erişim yok). Sentetik test = teknik doğrulama; gerçek pilot = ürün doğrulama — ikisi ayrı tutulur.

---

## 1. TEST SUMMARY

| Kategori | Sonuç |
|---|---|
| **Unit** | ⚠️ Yazılmadı (projede test framework yok; state machine/wake word = tarayıcı davranışı → manuel/gerçek cihaz) |
| **Integration** | ✅ **6/6 PASS** (info, rapor, görüşme özeti, günaydın, özel fiyat onay+iptal) |
| **E2E** | ✅ Otomatik akışlar PASS (komut→onay→çalıştır→audit; onay yoksa çalışmaz) |
| **Security** | ✅ **4/4 PASS** (injection PII sızmaz, onay bypass yok, secret sızmaz, idempotency) |
| **Disaster** | ✅ Backend restart → bekleyen onay kaybolur, "evet" işlemi ÇALIŞTIRMAZ (DB doğrulandı) |
| **Recovery** | ✅ Reconnect'te pending ack korunur; onay süresi dolunca "önceki onayınızın süresi doldu" mesajı |
| **Real microphone** | ⏳ **BEKLEMEDE** (cihaz hazır değil — P7.4) |
| **Pilot** | ❌ **YAPILMADI** (gerçek esnaf erişimi yok — demo tenant simülasyonu yapıldı, sentetik) |

## 2. Bulunan Buglar

| Seviye | Adet | Detay |
|---|---|---|
| 🔴 CRITICAL | 0 | — |
| 🟠 HIGH | 0 | — |
| 🟡 MEDIUM | 1 | READ komutlarında (REPORT/briefing/abonelik) usage maliyet kaydı yazılmıyordu → **düzeltildi** (P7.5) |
| 🔵 LOW | 1 | `recordUsage` latency iç ölçümü ~0 (gerçek AI çağrısı süresini değil çağrı-sonrasını ölçüyor) → gerçek latency test suite'te ölçülüyor |

**CRITICAL/HIGH yok → 4b için engel yok.**

## 3. Gerçek Mikrofon Sonuçları (P7.4)
⏳ **BEKLEMEDE** — cihaz (mikrofon/speaker) hazır olduğunda ölçülecek:
wake-word başarı, false trigger, STT doğruluğu, barge-in ("bir dakika"), push-to-talk.
Manuel checklist hazır: `docs/AI_CALISANIM_TEST_CHECKLIST.md`.

## 4. Pilot Sonuçları
❌ **Yapılmadı.** 3 işletme profili **demo tenant** üzerinde simüle edildi (Danet=sucuk/yoğun, Öz Taylan=lokum, Evrenkaya=yumurta/B2B). Tüm senaryolar teknik olarak geçti. Gerçek esnaf erişimi sağlandığında aynı test/ölçüm altyapısı gerçek tenant üzerinde tekrar çalıştırılabilir (`scripts/ai-employee-sim.mjs`, `scripts/ai-employee-test.mjs`).

## 5. Latency Değerleri (sentetik, gerçek DeepSeek)

| Profil | Ort. cevap süresi | Başarı |
|---|---|---|
| Sucuk / Yoğun (Danet) | **1.90 sn** | 5/5 |
| Lokum (Öz Taylan) | **1.67 sn** | 5/5 |
| Yumurta / B2B (Evrenkaya) | **1.63 sn** | 5/5 |

## 6. Tenant Başına Tahmini Aylık Maliyet

Ölçüm: ~8 konuşma ≈ $0.0008 → **~$0.0001/konuşma** (DeepSeek).

| Varsayım | Aylık projeksiyon |
|---|---|
| Esnaf günde ~4 konuşma (sipariş sorusu + komut) | 120 konuşma/ay ≈ **$0.012** |
| Bildirim TTS (20 sipariş/gün × 30) | ~600 bildirim ≈ **$0.05–0.15** (ElevenLabs TTS) |
| **Toplam/esnaf/ay** | **≈ $0.06–0.16** (kuruş seviyesi) |

> Bu, esnaf başına aylık **sembolik** bir maliyet. Realtime'a geçmek bu veriyle gereksiz görünüyor.

## 7. Mevcut B Mimarisinin Yetersiz Kaldığı Noktalar
- Sentetik testte **görülmedi** (latency 1.6-1.9s kabul edilebilir, tool başarı %100).
- Gerçek mik testinde görülebilecek potansiyel zayıflıklar (beklemede): wake-word false trigger, STT gürültü performansı, barge-in akıcılığı.

## 8. Realtime'a (4b) Geçiş İçin Somut Gerekçeler — **ŞU AN GEREK YOK**

**Durum 1 (B iyi) doğrulandı:**
- Ortalama cevap: 1.6–1.9 sn ✅ (hedef ≤2.5 sn)
- Tool başarı: %100 ✅
- Maliyet: sembolik ✅
- Onay güvenliği + audit: çalışıyor ✅
- CRITICAL/HIGH bug: yok ✅

**Karar:** **4b (OpenAI Realtime) şu an planlanmıyor.** B ile devam.
**Tekrar değerlendirme tetikleyicileri (gerçek mik/pilot sonrası):**
1. Gerçek mik testinde wake-word başarı <%90 veya false trigger yüksekse.
2. Esnaf "cevap yavaş / konuşma doğal değil" diyorsa.
3. Barge-in ("bir dakika") beklentiyi karşılamıyorsa.
4. Realtime fiyatları OpenAI resmi sayfasından doğrulanıp maliyet çarpanı hesaplanmadan geçilmez.

---

## Sonuç
- **Mevcut B mimarisi teknik olarak sağlam** (sentetik doğrulama).
- **Gerçek esnaf validasyonu bekleniyor** (pilot) — o tamamlanınca ürün doğrulaması da netleşir.
- **4b: ertelendi** — veri (latency/maliyet) B'nin yeterli olduğunu gösteriyor.