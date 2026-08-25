# SiparişAsistanı — Ölçekleme & Güvenilirlik Rehberi
### Proaktif Arıza İzleme, Destek Sistemi, Sağlamlaştırma ve Dış Bildirim (Faz 1+2+3+4)

Bu rehber, sistemi **10 → 100 esnafa** taşırken kurulan tüm yeni özelliklerin nasıl çalıştığını, hangi ekranlarda göründüğünü ve nasıl test edileceğini **basit ve adım adım** anlatır.

> **Kısa özet:** Bu çalışmanın tek amacı, esnaf "sistem bozuldu" demeden **önce sizin haber almanızı** sağlamaktır. Artık sistem; arızaları otomatik tespit eder, size bildirir, esnafın teknik desteğini yönetir ve verileri güvenle izole eder.

---

## İçindekiler

1. [Bu Rehber Ne Anlatıyor?](#1-bu-rehber-ne-anlatıyor)
2. [Yeni Ekranlar Hızlı Bakış](#2-yeni-ekranlar-hızlı-bakış)
3. [Faz 1 — Proaktif Arıza İzleme](#3-faz-1--proaktif-arıza-izleme)
   - [3.1 Kanal Sağlık Kaydı (Ne İzleniyor?)](#31-kanal-sağlık-kaydı-ne-izleniyor)
   - [3.2 Eşik ve Uyarı Sistemi](#32-eşik-ve-uyarı-sistemi)
   - [3.3 Esnaf Kanal Sağlık Ekranı](#33-esnaf-kanal-sağlık-ekranı)
   - [3.4 Webhook Idempotency (Çift Sipariş Engeli)](#34-webhook-idempotency-çift-sipariş-engeli)
4. [Faz 2 — Destek & Ticket Sistemi](#4-faz-2--destek--ticket-sistemi)
   - [4.1 Destek Sayfası](#41-destek-sayfası)
   - [4.2 AI Ön Tanı](#42-ai-ön-tanı)
5. [Faz 3 — Sağlamlaştırma ve Güvenlik](#5-faz-3--sağlamlaştırma-ve-güvenlik)
   - [5.1 Tenant İzolasyonu (RLS)](#51-tenant-izolasyonu-rls)
   - [5.2 Prompt Sürümleme ve Onay Kapısı](#52-prompt-sürümleme-ve-onay-kapısı)
   - [5.3 API Anahtar Ömür İzleme](#53-api-anahtar-ömür-izleme)
   - [5.4 KVKK Veri Saklama (Retention)](#54-kvkk-veri-saklama-retention)
   - [5.5 Per-Esnaf Maliyet ve Katkı](#55-per-esnaf-maliyet-ve-katkı)
6. [Faz 4 — Dış Arıza Bildirimleri (E-posta / WhatsApp / SMS)](#6-faz-4--dış-arıza-bildirimleri-e-posta--whatsapp--sms)
   - [6.1 Nasıl Çalışır](#61-nasıl-çalışır)
   - [6.2 Owner Bildirim Ayarları](#62-owner-bildirim-ayarları)
   - [6.3 Toplulaştırma (Ortak Sorun)](#63-toplulaştırma-ortak-sorun)
7. [Teknik Altyapı (Veritabanı & Kod)](#7-teknik-altyapı-veritabanı--kod)
8. [Test Rehberi — Adım Adım](#8-test-rehberi--adım-adım)
9. [Sık Sorulan Sorular (SSS)](#9-sık-sorulan-sorular-sss)

---

## 1. Bu Rehber Ne Anlatıyor?

Sistem 50-100 esnafa çıktığında en büyük risk şudur:

> **Esnaf "Abi WhatsApp çalışmıyor" der, siz fark etmezsiniz.**

Bu çalışmanın amacı bunu tersine çevirmek:

- **ESKİ:** Esnaf arar → siz bakarsınız → sorun bulursunuz (geç kalınmış).
- **YENİ:** Sistem sorunu **önce** görür → size uyarı gönderir → esnaf hiçbir şey fark etmez.

Ayrıca şunları da ekledik:
- Esnafın teknik destek taleplerini yönetmek için ayrı bir **Destek (Ticket)** sistemi.
- Veri güvenliği için **tenant izolasyonu** (bir esnafın verisi diğerine sızmaz).
- Promp'ta yapılan değişikliklerin **onaysız canlıya alınmasını** engelleyen sürüm sistemi.
- Veri saklama sürelerinin takip edildiği **KVKK Retention** ekranı.
- Hangi esnafın kâr ettirdiğini gösteren **maliyet takibi**.

---

## 2. Yeni Ekranlar Hızlı Bakış

| Ekran (URL) | Ne İşe Yarar | Kim Görür |
|---|---|---|
| `/support` | Esnafın teknik destek biletleri + AI ön tanı | Tüm roller |
| `/admin` → **Esnaf Kanal Sağlığı** | Tüm esnafların kanal durumları (🟢🟡🔴) | Owner |
| `/admin` → **Maliyet & Katkı** | Esnaf başına AI maliyeti ve kârlılık | Owner |
| `/prompts` | Prompt sürümleme + onay kapısı | Owner |
| `/health` → **KVKK Retention** | Otomatik veri silme takibi | Owner / Manager / Staff |
| `/admin` → **Arıza Bildirimleri** | Owner e-posta/WhatsApp/SMS dış bildirim ayarları | Owner |

---

## 3. Faz 1 — Proaktif Arıza İzleme

### 3.1 Kanal Sağlık Kaydı (Ne İzleniyor?)

Sistem, her dış hizmetle (dış kanalla) iletişim kurduğunda o kanalın **durumunu kaydeder**. İzlenen kanallar:

| Kanal | Açıklama |
|---|---|
| **phone** | Telefon / sesli arama (NetGSM) |
| **whatsapp** | WhatsApp mesaj gönderimi |
| **instagram** | Instagram DM |
| **sms** | SMS gönderimi |
| **website** | Web sitesi siparişleri |

Her kanal için tutulan veri:
- Son başarılı işlem zamanı
- Son hata zamanı ve hatanın kodu/açıklaması
- Son 1 saatteki başarılı / hatalı işlem sayısı
- Genel durum: `unknown` (bilinmiyor) → `ok` (çalışıyor) → `degraded` (arızalı) → `down` (kesinti)

> **Nereden geliyor?** Bu kayıtlar otomatik. WhatsApp/SMS gönderimi yapıldığında kod, sonucu sağlık tablosuna yazar. Siz hiçbir şey yapmazsınız.

### 3.2 Eşik ve Uyarı Sistemi

Sistem iki şekilde sorun tespit eder:

**A) Hata sayacı eşiği (hızlı tespit):**
- Bir kanalda **3 veya daha fazla ardışık hata** olursa kanal `degraded` olur.
- Bu durumda **admin paneline uyarı bildirimi** düşer:
  > ⚠️ whatsapp kanalında sorun — Son hata: META_API_TOKEN (TOKEN_EXPIRED)

**B) Sessizlik taraması (yavaş, sinsi arızalar):**
- Sistem her 5 dakikada bir çalışır ve `ok` görünen ama **15 dakikadır hiç başarılı işlem yapmamış** kanalları kontrol eder.
- Eğer böyle bir kanal varsa onu `degraded` yapar ve uyarı üretir. (Kanalın "hiç sesi çıkmıyor" olması da bir arızadır.)

> **Not:** Bu uyarılar aynı kanal için tekrar tekrar gitmez — kanal `degraded` durumundayken aynı kanal için yeni uyarı açılmaz (spam önlenir).

### 3.3 Esnaf Kanal Sağlık Ekranı

**Nerede:** `/admin` (Geliştirici) → **"Esnaf Kanal Sağlığı"** tablosu

Bu tablo **tüm esnafların** kanal durumunu tek ekranda gösterir:

| Esnaf | Telefon | WhatsApp | Instagram | SMS | Web |
|---|---|---|---|---|---|
| Ahmet Kasap | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| Mehmet Kasap | 🟢 | 🟡 | 🟢 | 🟢 | 🟢 |
| Ömer Sucuk | 🟢 | 🔴 | 🟢 | 🟢 | 🟢 |

- **🟢 Yeşil** = Çalışıyor
- **🟡 Turuncu** = Arızalı (3+ hata veya 15 dk sessiz)
- **🔴 Kırmızı** = Kesinti
- **Gri** = Veri yok (kanal henüz kullanılmadı)

**Bir esnaf satırına tıklarsanız** altta detay paneli açılır:
- Son başarılı işlem zamanı
- Son hata zamanı + hata açıklaması
- Son 1 saat: X başarılı / Y hata

> **İpucu:** Kırmızı/turuncu olan satırların üzerinde kırmızı bir sol çizgi de belirir. Böylece sorunlu esnafları anında görürsünüz.

### 3.4 Webhook Idempotency (Çift Sipariş Engeli)

**Sorun:** Meta (WhatsApp/Instagram) veya NetGSM gibi servisler, bir hata olduğunda **aynı mesajı birden fazla kez** gönderebilir. Eğer sistem bunu fark etmezse, aynı sipariş **2 kez** oluşturulabilir.

**Çözüm:** Her gelen webhook event'ine benzersiz bir **event ID** (`provider_message_id`) atanır. Sistem bir ID'nin daha önce işlendiğini görürse o mesajı **yok sayar**.

```
Webhook geldi
   ↓
Event ID daha önce işlendi mi?
   ↓
EVET → "duplicate" döner, işlem yapılmaz (sipariş 2 kez oluşmaz)
   ↓
HAYIR → Event kaydedilir, AI işler, sipariş oluşur
```

**Kapsam:** WooCommerce, Shopify, Ideasoft, Ticimax, Custom webhook + Instagram DM mesajları.

---

## 4. Faz 2 — Destek & Ticket Sistemi

### 4.1 Destek Sayfası

**Nerede:** `/support` (sol menüde "Destek")

Bu sistem **esnafın teknik desteği** içindir. **Müşteri şikâyetinden (Talep & İstek / complaints) tamamen ayrıdır:**

| | Müşteri Şikâyeti (`/complaints`) | Esnaf Teknik Desteği (`/support`) |
|---|---|---|
| Kim | Müşteri | Esnaf |
| Örnek | "Sucuk geç geldi" | "WhatsApp çalışmıyor" |
| Kategori | general, kargo... | telefon, whatsapp, instagram, sms, ai, sipariş, ödeme... |

**Yapabilecekleriniz:**
- **Destek Talebi Aç:** Konu + kategori + öncelik + açıklama.
- **Liste ve filtre:** Açık / İnceleniyor / Çözüldü / Kapalı.
- **Detay paneli:** Bilete tıkla → yazışmaları gör, yanıt yaz.
- **Durum değiştir:** Açık → İnceleniyor → Çözüldü → Kapalı.

### 4.2 AI Ön Tanı

Her biletin detayında bir **"AI Ön Tanı"** bölümü vardır. "Tanı Çalıştır" butonuna basınca:

1. Sistem, o bilete ait kanalın sağlık durumunu kontrol eder.
2. Kanala göre teşhis üretir:
   - Kanal arızalıysa → "WhatsApp kanalında bağlantı sorunu tespit edildi. Son hata: ... Son başarılı işlem: ..."
   - Kanal çalışıyorsa → "WhatsApp kanalınız şu anda çalışıyor görünüyor."
   - Veri yoksa → "Bu kanal için henüz sağlık verisi bulunmuyor."
3. Teşhis hem bilete yazılır hem de yazışmaya AI mesajı olarak eklenir.

> **Güvenlik kuralı (önemli):** AI **sadece teşhis** koyar ve ne yapılacağını söyler. AI, esnafın token'ını yenilemez, ödeme yapmaz, yapılandırma değiştirmez. Bu tür işlemler **insan onayına** kalır.

---

## 5. Faz 3 — Sağlamlaştırma ve Güvenlik

### 5.1 Tenant İzolasyonu (RLS)

**Sorun:** 100 esnaf aynı veritabanında. Ahmet Kasap'ın müşteri listesi Mehmet Kasap'a **kesinlikle** görünmemeli.

**Çözüm — Row Level Security (RLS):** Veritabanı seviyesinde her tabloya kural ekledik. Bu kural şunu garantiler:

> Bir esnaf, **yalnızca kendi `tenant_id`'si ile eşleşen** satırları görebilir. Frontend kontrolüne güvenilmez; veritabanı bunu zorlar.

RLS korumasına alınan kritik tablolar:
- `api_keys` (API anahtarları — en kritik)
- `customer_prices` (müşteri özel fiyatları)
- `instagram_conversations` / `instagram_messages` (DM verisi)
- `webhook_configs` (web sitesi anahtarları)
- `sales_campaigns` / `campaign_logs` (pazarlama)
- `account_transactions` (cari hesap)
- + Tüm yeni tablolar (channel_health, support_tickets, webhook_events, prompt_versions...)

> **Not:** Uygulama `service_role` anahtarı kullandığı için kendi iç işlemleri (sipariş oluşturma vb.) RLS'den etkilenmez. RLS, dışarıdan/ön yüzden gelen istekleri korur.

### 5.2 Prompt Sürümleme ve Onay Kapısı

**Sorun:** Bir prompt değişikliği **100 esnaf × binlerce görüşmeyi** etkiler. "Kaydet → direkt canlıya al" risklidir; yanlış bir değişiklik tüm sistemi bozar.

**Çözüm:** Her prompt artık bir sürümleme ve onay akışından geçer:

```
DRAFT (Taslak) → APPROVED (Onaylandı) → ACTIVE (Aktif)
```

**Nerede:** `/prompts` → "Sürüm Oluştur" → "Sürümler" paneli

**Nasıl çalışır:**
1. Promptu düzenleyip **"Sürüm Oluştur"** → yeni bir taslak (draft) sürüm kaydedilir. **Eski sürümler korunur.**
2. "Sürümler"e bas → tüm sürümler listelenir (v1, v2...).
3. Bir sürümde **"Onayla"** → sistem otomatik sağlık kontrolü yapar:
   - Ürün kataloğu değişkeni (`{{products_list}}`) eksikse → **onay engellenir**
   - Ödeme değişkeni eksikse (telefon kanalında) → **onay engellenir**
   - Prompt çok kısaysa → **onay engellenir**
4. **"Aktif Et"** → bu sürüm canlıya alınır, önceki aktif sürüm otomatik devre dışı kalır.
5. Aktif edilen prompt, sistemin runtime'da kullandığı yere de yazılır.

> **İpucu:** Bir promptu değiştirmeden önce her zaman "Sürüm Oluştur" yapın. Sorun olursa eski aktif sürüme geri dönebilirsiniz.

### 5.3 API Anahtar Ömür İzleme

**Sorun:** Instagram/WhatsApp token'ları zamanla **süresi dolar**. En sık duyulan "dün çalışıyordu bugün çalışmıyor" şikâyetinin sebebi budur.

**Çözüm:** Sistem her 30 dakikada bir API anahtarlarını kontrol eder:
- **🟡 7 gün içinde sona erecek** anahtar → uyarı ("yenilenmeli")
- **🔴 Süresi geçmiş** anahtar → kanal `down` işaretlenir + uyarı

Böylece token problemi, müşteri/esnaf şikâyet etmeden önce size ulaşır.

> **Ayarlamak için:** API anahtarına `expires_at` (bitiş tarihi) bilgisi girildiğinde izleme başlar.

### 5.4 KVKK Veri Saklama (Retention)

**Sorun:** "30 gün sonra ses kaydı silinir" demek yetmez; ne zaman silindi, kaç kayıt silindi, hata oldu mu **görülmeli**.

**Çözüm — Retention Monitor:** `/health` (Sistem Durumu) → **"KVKK Veri Saklama"** bölümü.

Burada görürsünüz:
- **Toplam silinen kayıt** sayısı
- **Başarısız** sayısı
- **Son temizlik** zamanı
- Son temizlik işlemlerinin detayı (hangi kategori, kaç kayıt)

**Otomatik temizlik:** Her gün **03:00'te** çalışır. Farklı veri türleri **farklı sürelerle** tutulur (ayrı değerlendirilir):
- `call_recordings` (ses kaydı) → kısa süre
- `ai_audit_logs` (AI denetim) → ayrı süre
- `activity_logs` (aktivite/transcript) → ayrı süre

> Her temizlik işlemi `retention_logs` tablosuna **denetim kaydı** olarak yazılır — bu, KVKK uyumluluğu için önemlidir.

### 5.5 Per-Esnaf Maliyet ve Katkı

**Nerede:** `/admin` (Geliştirici) → **"Esnaf Başına Maliyet & Katkı (Son 30 Gün)"**

Bu tablo şunu gösterir: **Her esnaf size para kazandırıyor mu, kaybettiriyor mu?**

| Esnaf | Plan | AI Maliyet | Görüşme | Paket | Katkı |
|---|---|---|---|---|---|
| Ahmet Kasap | Pro | 490 TL | 120 | 2.749 TL | **+2.259 TL** |
| Mehmet Kasap | Pro | 1.280 TL | 310 | 2.749 TL | **+1.469 TL** |

- **AI Maliyet:** Son 30 günde kullanılan AI token'larının tahmini maliyeti (DeepSeek/OpenAI model fiyatlarına göre).
- **Paket:** Esnafın aylık paket fiyatı.
- **Katkı:** Paket fiyatı − AI maliyeti. Pozitifse esnaf kâr ettirir, negatifse zarar ettirir.

> Bu, sadece muhasebe değil; hangi esnafın gerçekten kârlı olduğunu anlamak için kritiktir.

---

## 6. Faz 4 — Dış Arıza Bildirimleri (E-posta / WhatsApp / SMS)

### 6.1 Nasıl Çalışır

Sistem bir arıza tespit ettiğinde artık **sadece uygulama içi zil** çalmaz; isterseniz size **e-posta, WhatsApp ve SMS** ile de ulaşır. Böylece paneli sürekli kontrol etmenize gerek kalmaz.

Akış şu şekilde işler:

```
Arıza tespit edildi (örn. WhatsApp token hatası)
   ↓
Sistem, owner bildirim ayarlarını okur
   ↓
E-posta gönderilir (eğer açıksa)
   ↓
WhatsApp gönderilir (eğer açık ve yapılandırılmışsa)
   ↓
WhatsApp çalışmazsa → SMS yedek gönderilir
```

**Önemli:** Bu, paneldeki (zil) bildirimin **yerine geçmez** — onun **üzerine ek** bir kanaldır. Her ikisi de çalışır.

### 6.2 Owner Bildirim Ayarları

**Nerede:** `/admin` (Geliştirici) → **"Arıza Bildirimleri (E-posta / WhatsApp / SMS)"**

Burada **istediğiniz zaman** değiştirebilirsiniz (kod/dağıtım gerekmez):

- **E-posta adresiniz**
- **WhatsApp numaranız**
- **SMS numaranız** (WhatsApp yedek)
- **Bildirim kanalları** (e-posta / WhatsApp / SMS aç-kapat)
- **Toplulaştırma eşiği** ve **pencere süresi**

> **Numaranızı değiştirdiyseniz:** Buradan güncelleyin. Bir sonraki arıza bildirimi **yeni numaraya** gider. Eski numaraya gitmez.

### 6.3 Toplulaştırma (Ortak Sorun)

50 esnafta aynı anda DeepSeek çökerse 50 ayrı bildirim almak istemezsiniz. Sistem bunu önler:

- **Aynı sorun** (aynı kanal + aynı hata kodu) **toplulaştırma eşiği** kadar esnafta görülürse → **tek bildirim** gelir:
  > ⚠️ SİSTEM GENELİ: 5 esnafta sorun — WhatsApp token hatası
- **Eşik değerinden az** veya **farklı sorunlar** varsa → her esnaf için **ayrı bildirim** gelir.

**Varsayılan eşik:** 2 (panelden değiştirilebilir)
**Varsayılan pencere:** 5 dakika (panelden değiştirilebilir)

**Bildirim içeriği — tek esnaf arızası:**
```
⚠️ ARİZA: Danet Sucukları
Kanal: WhatsApp
Sorun: META_API_TOKEN (TOKEN_EXPIRED)
Zaman: 25.08.2026 09:45
Çözüm: API anahtarını/token'ı yenileyin.
Detay: /admin > Esnaf Kanal Sağlığı
```

**Bildirim içeriği — ortak (toplulaştırılmış) arıza:**
```
⚠️ SİSTEM GENELİ: 5 esnafta sorun
Ortak sorun: whatsapp — TOKEN_EXPIRED
Etkilenen: Danet Sucukları, Ömer Kasap, ...
Tespit: 25.08.2026 09:45
Çözüm: API anahtarını/token'ı yenileyin.
Detay: /admin > Esnaf Kanal Sağlığı
```

> **Not:** E-posta gönderimi için `.env` içinde **SMTP** bilgileri girilmelidir (SMTP_HOST, SMTP_USER, SMTP_PASS). SMTP girilmemişse e-posta atlanır, WhatsApp/SMS yine çalışır.

---

## 7. Teknik Altyapı (Veritabanı & Kod)

Bu rehberi okurken teknik ayrıntıya ihtiyaç duyarsan:

### Veritabanı tabloları (migration'lar)

| Migration | Tablo(lar) | Amaç |
|---|---|---|
| `047_channel_health.sql` | `channel_health`, `channel_health_events`, `channel_health_alerts` | Kanal sağlığı izleme |
| `048_webhook_events.sql` | `webhook_events` | Webhook idempotency |
| `049_support_tickets.sql` | `support_tickets`, `support_ticket_messages` | Destek sistemi |
| `050_tenant_isolation.sql` | (mevcut tablolara RLS) | Tenant izolasyonu |
| `051_prompt_versions.sql` | `prompt_versions` | Prompt sürümleme |
| `052_token_expiry.sql` | (`api_keys`'e kolon) | Token ömür izleme |
| `053_retention_logs.sql` | `retention_logs` | KVKK retention takibi |
| `054_admin_alert_settings.sql` | `admin_alert_settings` + `channel_health_alerts.external_notified` | Owner dış bildirim ayarları |

### Kod dosyaları

| Dosya | Görev |
|---|---|
| `apps/api/src/channel-health/` | Kanal sağlığı servisi + controller + cron taramaları |
| `apps/api/src/webhook/webhook-dedup.service.ts` | Webhook tekilleştirme |
| `apps/api/src/support/` | Destek/ticket API'si + AI tanı |
| `apps/api/src/ai-test/prompt-version.service.ts` | Prompt sürümleme |
| `apps/api/src/kvkk/kvkk.service.ts` | KVKK cleanup + retention log |
| `apps/api/src/alert/` | AlertRouter — dış bildirim (e-posta/WA/SMS) + toplulaştırma |
| `apps/web/src/app/support/page.tsx` | Destek sayfası |
| `apps/web/src/app/admin/page.tsx` | Esnaf sağlığı + maliyet + arıza bildirim ayarları |
| `apps/web/src/app/prompts/page.tsx` | Prompt sürüm yönetimi |
| `apps/web/src/app/health/page.tsx` | KVKK retention bölümü |

### API uç noktaları (önemli olanlar)

| Metod | Yol | Açıklama |
|---|---|---|
| GET | `/api/channel-health/tenant/:id` | Tek esnafın kanal sağlığı |
| GET | `/api/admin/tenants/health` | Tüm esnafların kanal sağlığı (owner) |
| GET | `/api/admin/costs` | Esnaf başına maliyet (owner) |
| GET | `/api/support/:id` | Destek biletleri |
| POST | `/api/support/:id` | Destek bileti aç |
| POST | `/api/support/:id/:ticketId/messages` | Mesaj ekle |
| POST | `/api/support/:id/:ticketId/diagnose` | AI ön tanı çalıştır |
| POST | `/api/ai-test/prompt-version/save-draft` | Prompt taslağı oluştur |
| POST | `/api/ai-test/prompt-version/approve` | Prompt onayla |
| POST | `/api/ai-test/prompt-version/activate` | Prompt aktif et |
| GET | `/api/kvkk/retention/:id` | Retention özeti |
| GET | `/api/alert/settings` | Owner bildirim ayarlarını oku |
| PUT | `/api/alert/settings` | Owner bildirim ayarlarını güncelle |

---

## 8. Test Rehberi — Adım Adım

Aşağıdaki adımlarla tüm özellikleri test edebilirsin. Sistem `localhost:3000`'de çalışıyor.

### Test 1: Destek Sistemi (`/support`)
1. Sol menüden **Destek**'e tıkla.
2. **"Destek Talebi Aç"** → konu yaz (örn. "WhatsApp çalışmıyor"), kategori **WhatsApp**, açıklama ekle → **Talebi Oluştur**.
3. Listede bilet görünür (Açık / Yüksek).
4. Bilete tıkla → sağ panel açılır.
5. **"Tanı Çalıştır"** → AI, WhatsApp kanalının sağlığını kontrol edip teşhis yazar.
6. Bir yanıt yazıp **gönder**, durumu **Çözüldü** yap.

### Test 2: Esnaf Kanal Sağlığı (`/admin`)
1. **Geliştirici** sayfasına git (owner hesabıyla).
2. **"Esnaf Kanal Sağlığı"** tablosunu bul.
3. WhatsApp kanalı turuncu/kırmızıysa (arızalıysa) o satıra tıkla.
4. Detay panelinde son hata ve son 1 saat istatistiğini gör.

> **Not:** Veri yoksa kanallar henüz kullanılmamış demektir. Gerçek bir WhatsApp/SMS gönderimi yapınca sağlık verisi dolar.

### Test 3: Maliyet & Katkı (`/admin`)
1. Aynı admin sayfasında **"Esnaf Başına Maliyet & Katkı"** tablosunu bul.
2. Esnaf satırlarında AI maliyeti, paket fiyatı ve katkı değerlerini gör.
3. AI görüşmeleri yapıldıkça maliyet değerleri artar.

### Test 4: Prompt Sürümleme (`/prompts`)
1. **Promptlar** sayfasına git.
2. Kanal **Telefon**, durum **Karşılama** seç → **"Promptu Yükle"**.
3. Bir değişiklik yap → **"Sürüm Oluştur"**.
4. **"Sürümler"** butonuna bas → yeni sürümü **Onayla** → **Aktif Et**.
5. Eski sürüme geri dönmek istersen geçmişteki sürümü Aktif Et.

### Test 5: KVKK Retention (`/health`)
1. **Sistem Durumu** sayfasına git.
2. **"KVKK Veri Saklama"** bölümünü bul.
3. Toplam silinen / başarısız / son temizlik bilgilerini gör.
4. Otomatik temizlik her gün 03:00'te çalışır; o saatten sonra liste güncellenir.

### Test 6: Arıza Bildirim Ayarları (`/admin`)
1. **Geliştirici** sayfasına git.
2. **"Arıza Bildirimleri"** bölümünü bul.
3. E-posta + WhatsApp + SMS numaralarını gir, kanalları aç.
4. **"Bildirim Ayarlarını Kaydet"** → "Kaydedildi!" görünür.
5. Bir arıza oluştuğunda (örn. bir kanalı degrade et) sistem belirtilen kanallardan bildirim gönderir.
6. **Numara değiştirirsen:** Buradan güncelle, sonraki bildirim yeni numaraya gider.

> **Not:** E-posta için `.env`'de SMTP bilgileri girilmelidir. WhatsApp/SMS için ilgili API anahtarları (api-keys) yapılandırılmış olmalıdır.

---

## 9. Sık Sorulan Sorular (SSS)

**S: "Esnaf Kanal Sağlığı" tablosunda neden her şey gri?**
C: Kanal henüz kullanılmamış demektir. Sağlık verisi, gerçek WhatsApp/SMS/Instagram işlemleri yapıldığında otomatik dolar.

**S: WhatsApp turuncu (arızalı) görünüyor ama ben sorun görmüyorum.**
C: Bu, son 15 dakikada başarılı işlem yapılmadığı veya 3+ hata oluştuğu anlamına gelir. Detay panelinden son hatayı görüp nedeni anlayabilirsin.

**S: AI destek tanısı bir kanalı düzeltebilir mi?**
C: Hayır. AI **sadece teşhis** koyar ve öneri verir. Token yenileme, ödeme, yapılandırma gibi işlemleri yalnızca insan yapar (güvenlik gereği).

**S: Prompt değiştirdim ama kaydetmek istemiyorum, eski hâline dönebilir miyim?**
C: Evet. "Sürüm Oluştur" ile yaptığınız değişiklikler eski sürümleri **silmez**. "Sürümler" panelinden eski bir sürümü "Aktif Et" ile geri dönebilirsiniz.

**S: KVKK retention neden önemli?**
C: KVKK, kişisel verilerin belirli süre sonra silinmesini şart koşar. Bu ekran, silme işlemlerinin gerçekten yapıldığını **kanıtlar** (denetim kaydı). "30 gün sonra silinir" demek yetmez; silindiğini görebilmeniz gerekir.

**S: Maliyet tablosunda "AI Maliyet" neden 0?**
C: Henüz AI görüşmesi yapılmamış. Gerçek müşteri görüşmeleri / AI çağrıları yapıldıkça token maliyeti otomatik hesaplanır ve dolar.

**S: Bu özellikler müşteri şikâyetleriyle (Talep & İstek) karışır mı?**
C: Hayır. Müşteri şikâyetleri `complaints` tablosunda, esnaf teknik desteği `support_tickets` tablosunda **ayrı** tutulur. İki ayrı ekran ve iki ayrı veri dünyasıdır.

---

## Sonuç

Bu rehberdeki tüm özelliklerin ortak amacı: **Sisteminizin 10'dan 100 esnafa büyürken güvenilir, izlenebilir ve güvenli kalması.**

Özetle:
- **Arızaları sizden önce görürsünüz** (kanal sağlığı + uyarılar).
- **Çift sipariş oluşmaz** (webhook idempotency).
- **Esnafın teknik desteğini yönetirsiniz** (destek/ticket + AI ön tanı).
- **Veriler güvende** (tenant izolasyonu / RLS).
- **Prompt hataları tüm sistemi bozamaz** (sürüm + onay kapısı).
- **Veri saklama KVKK uyumlu** (retention monitor).
- **Hangi esnaf kârlı biliyorsunuz** (maliyet takibi).

---

*Bu rehber, Faz 1+2+3 uygulamasının tamamını kapsar. Sorularınız için sistem dokümantasyonunun diğer dosyalarına da başvurabilirsiniz.*
