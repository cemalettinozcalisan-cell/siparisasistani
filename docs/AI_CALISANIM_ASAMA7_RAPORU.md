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
| **Real microphone** | ⏳ **PENDING — P7.4** (cihaz hazır değil; yapılmadan Realtime'a geçilmez) |
| **Pilot** | ❌ **YAPILMADI** — P7.5 = **SYNTHETIC TECHNICAL VALIDATION** (demo tenant simülasyonu, gerçek esnaf değil) |

## 2. Bulunan Buglar

| Seviye | Adet | Detay |
|---|---|---|
| 🔴 CRITICAL | 1 | **Production auth: unsalted SHA-256 + 2 düz metin şifre satırı** (`auth.service.ts:24`) → bkz. §9 |
| 🟠 HIGH | 0 | — |
| 🟡 MEDIUM | 1 | READ komutlarında (REPORT/briefing/abonelik) usage maliyet kaydı yazılmıyordu → **düzeltildi** (P7.5) |
| 🔵 LOW | 1 | `recordUsage` latency iç ölçümü ~0 (gerçek AI çağrısı süresini değil çağrı-sonrasını ölçüyor) → gerçek latency test suite'te ölçülüyor |

**4b nihai kararı CRITICAL bulgudan bağımsız olarak P7.4/P7.5 pilot verisini bekliyor (PROVISIONAL, bkz. §8).**

## 3. Gerçek Mikrofon Sonuçları (P7.4)
⏳ **STATUS: PENDING** — cihaz (mikrofon/speaker) hazır olduğunda ölçülecek:
wake-word başarı, false trigger, STT doğruluğu, barge-in ("bir dakika"), push-to-talk.
Manuel checklist hazır: `docs/AI_CALISANIM_TEST_CHECKLIST.md`.

## 4. Pilot Sonuçları
❌ **Yapılmadı.** 3 işletme profili **demo tenant** üzerinde simüle edildi (Danet=sucuk/yoğun, Öz Taylan=lokum, Evrenkaya=yumurta/B2B). Tüm senaryolar teknik olarak geçti.

**STATUS: P7.5 = SYNTHETIC TECHNICAL VALIDATION** — Bu simülasyon ürünün/esnafın gerçek kullanımını ölçmez; yalnızca teknik akışların çalıştığını doğrular. Gerçek esnaf erişimi sağlandığında aynı araçlar gerçek tenant üzerinde yeniden çalıştırılacaktır (`scripts/ai-employee-sim.mjs`, `scripts/ai-employee-test.mjs`).

> **NOT:** Gerçek esnaf pilotu olmadan "esnaf memnuniyeti" veya "gerçek kullanıcı başarısı" iddiasında bulunulmaz.

## 5. Latency Değerleri (sentetik, gerçek DeepSeek)

| Profil | Ort. cevap süresi | Başarı |
|---|---|---|
| Sucuk / Yoğun (Danet) | **1.90 sn** | 5/5 |
| Lokum (Öz Taylan) | **1.67 sn** | 5/5 |
| Yumurta / B2B (Evrenkaya) | **1.63 sn** | 5/5 |

## 6. Tenant Başına Tahmini Aylık Maliyet — **SYNTHETIC TEST COST**

> ⚠️ Bu rakamlar **gerçek esnaf maliyeti DEĞİLDİR**. Sentetik test maliyetidir.
> Gerçek maliyet için P7.4 (gerçek mik/kullanım) ve P7.5 (gerçek esnaf) verisi gerekir.

### 6.1 Hesaplama detayı (ölçülen)

| Kalem | Değer |
|---|---|
| Provider | **DeepSeek** (OpenAI Realtime yok) |
| Model | **deepseek-chat** |
| Input token (tahmini) | **6** (ort.) — `recordUsage` `ceil(text.length/4)` ile **TAHMİN** eder |
| Output token (varsayılan) | **100** — **SABİT varsayım** (gerçek API token sayısı loglanmıyor) |
| Pricing config (`ai_pricing`) | input $0.00027/1k, output $0.00110/1k (2026-09-15) |
| Konuşma sayısı (sim) | 8/tenant |
| Ölçülen sim maliyeti | 8 konuşma ≈ **$0.0008/tenant** → **≈$0.0001/konuşma** |

Formül: `(6/1000)×0.00027 + (100/1000)×0.00110 = $0.0001116 → ~$0.0001` ✅ (kayıtla uyumlu)

### 6.2 Aylık projeksiyon — **VARSAYIM**

| Varsayım | Aylık projeksiyon |
|---|---|
| Esnaf günde ~4 konuşma | 120 konuşma/ay ≈ **$0.012** (LLM kısmı) |
| Bildirim TTS | **ÖLÇÜLMEDİ** — `ai_pricing`'te elevenlabs/tts fiyatı **$0**; gerçek TTS karakter/maliyet verisi yok |
| **Toplam/esnaf/ay** | **≈ $0.012–0.16 (varsayım aralığı)** |

> ⚠️ TTS kısmı ($0.05–0.15) **ölçülmemiş varsayımdır**; gerçek ElevenLabs faturalama verisi ile doğrulanmalıdır.
> Token sayıları tahmini/sabit olduğundan LLM maliyeti de gerçek DeepSeek faturalaması ile doğrulanmalıdır.
> **Gerçek maliyet = P7.4 (kullanım sıklığı) + P7.5 (gerçek esnaf) verisiyle hesaplanacak.**

## 7. Mevcut B Mimarisinin Yetersiz Kaldığı Noktalar
- Sentetik testte **görülmedi** (latency 1.6-1.9s kabul edilebilir, tool başarı %100).
- Gerçek mik testinde görülebilecek potansiyel zayıflıklar (beklemede): wake-word false trigger, STT gürültü performansı, barge-in akıcılığı.

## 8. Realtime'a (4b) Geçiş Kararı — **PROVISIONAL**

**STATUS: 4b DECISION = PROVISIONAL**
"B currently sufficient based on automated/synthetic tests; **final decision pending real microphone (P7.4) and real pilot validation**."

- 🔴 **CRITICAL bulgu (şifre saklama) çözülmeden** önce bile 4b ile ilgili nihai teknik karar ertelenmiştir.
- **Gerçek mikrofon testi (P7.4) yapılmadan Realtime entegrasyonuna başlanmaz.**
- **Gerçek esnaf pilotu olmadan "esnaf memnuniyeti" / "gerçek kullanıcı başarısı" iddiasında bulunulmaz.**

**Sentetik testte doğrulananlar (yalnızca teknik):**
- Ortalama cevap: 1.6–1.9 sn (hedef ≤2.5 sn)
- Tool başarı: %100 (sentetik)
- Onay güvenliği + audit: çalışıyor
- Maliyet: sembolik (sentetik)

**Bekleyen doğrulamalar (nihai karar için):**
1. P7.4 gerçek mik: wake-word başarı, false trigger, STT doğruluğu, barge-in.
2. Gerçek esnaf pilotu: memnuniyet, gerçek kullanım sıklığı, gerçek maliyet verisi.
3. Realtime fiyatları OpenAI resmi sayfasından doğrulanıp maliyet çarpanı hesaplanmadan geçilmez.

---

## 9. 🔴 CRITICAL — Şifre Saklama Güvenlik Bulgusu (P7 doğrulaması)

**Bulgu (kesin tespit):** Production kullanıcı authentication sistemi, **Supabase Auth (auth.users) DEĞİL** — özel/legacy bir mekanizma:
- `apps/api/src/auth/auth.service.ts:24` — `crypto.createHash('sha256').update(password).digest('hex')` → **unsalted SHA-256**.
- DB'de 7 kullanıcıdan **5'i unsalted SHA-256**, **2'si DÜZ METİN şifre** (aynı email `ahmet@ahmetipek.com` iki satır, ikisi de owner, uzunluk 18 & 23).
- Mock fallback (satır 57-74): `demo@siparisasistani.com` + `demo123` gibi **hardcoded demo kimlikler production kod yolunda** (catch-all).
- Oturumlar in-memory `Map` → restart'ta tüm oturumlar düşer (kullanılabilirlik notu).

**Bu bir TEST mekanizması değildir — production kullanıcı kimlik doğrulamasıdır.** SHA-256 hızlı/hash hızında brute-force + rainbow-table risklidir; düz metin satırlar doğrudan sızıntıdır. → **CRITICAL finding.**

### Çözüm önerisi (öncelik sırasıyla)
1. **Düz metin satırları anında geçersiz kıl**: `users.password` → rastgele değere çevir (kullanıcı "şifremi unuttum" akışından sıfırlasın). Email duplicate'ı temizle (unique constraint).
2. **bcrypt/argon2id'e göç**: Node yerleşik `crypto.scrypt` (ek bağımlılık yok) veya bcrypt. Per-user salt ile.
3. **Kademeli migrasyon**: login'de SHA-256 eşleşirse → scrypt hash'le → kaydet → SHA-256 yolunu tüm kullanıcılar göçene kadar fallback tut → sonra SHA-256 yolunu kaldır.
4. **Mock fallback'i production'dan ayır**: `NODE_ENV === 'development'` koşuluna al.
5. (Opsiyonel) Supabase Auth'a geçiş uzun vadede.

**Test kullanıcıları doğrulaması:** Simülasyonda oluşturulan geçici `temptest-*@test.local` kullanıcıları (3 adet) **silinmiştir (0 kaldı)**; yalnızca insert+delete yapıldı, **mevcut production kullanıcılarına dokunulmadı**. Yine de yukarıdaki CRITICAL bulgu mevcut kodda bağımsız olarak geçerlidir.