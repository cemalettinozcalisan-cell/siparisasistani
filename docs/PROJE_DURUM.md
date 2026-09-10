# PROJE_DURUM.md — SiparişAsistanı Bilgi Merkezi

> Bu belge, projenin **güncel tek kaynaklı haritasıdır**. Yeni bir oturuma başlarken önce buradan başla.
> Derin detay için ilgili bölümdeki referans dokümanına git. Güncelleme: bu dokümanın tarihi.

---

## 1. Proje Özeti & Vizyon

**SiparişAsistanı**, işletmelerin (esnafların) sipariş yönetimini AI destekli yürüten bir asistandır. Tek merkezden;
çoklu kanaldan (telefon/WhatsApp/Instagram/SMS/web) gelen sipariş ve talepleri toplar, AI ile yönetir, raporlar.

Kapsanan alanlar:
- Sipariş alma ve yönetme (web + WhatsApp + Instagram + SMS + telefon)
- Müşteri yönetimi ve segmentasyon
- Envanter / ürün / toptan satış (AI fiyatlandırma)
- Kampanya & toplu mesajlaşma (IYS izinli)
- Kargo entegrasyonları + otomatik takip
- Şikayet hattı (birleşik, 4 kanaldan)
- Proaktif arıza izleme & esnaf sağlığı
- Destek/ticket + akıllı chatbot
- **Yedekleme & felaket kurtarma (DR)**
- **KVKK uyumu & saklama yönetimi**

---

## 2. Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Monorepo | pnpm workspace + Turborepo (`turbo dev/build/lint`) |
| Backend | `apps/api` — **NestJS 10** (REST, global `/api` prefix) |
| Frontend | `apps/web` — **Next.js 14** (App Router), React 18, Tailwind, lucide-react, zustand |
| Veritabanı | **Supabase** (PostgreSQL + Auth + RLS) |
| Paylaşılan tipler | `packages/types` (`@siparis/types`) |
| AI | DeepSeek + OpenAI (`openai` SDK) |
| Ses | ElevenLabs (ses kaydı/voice) |
| SMS | NetGSM |
| E-posta | nodemailer |
| İzleme | Sentry (`@sentry/nestjs` + profiling) |
| Doğrulama | class-validator, zod |
| Paketleme/yönetim | NestJS Schedule (cron), @nestjs/config |

---

## 3. Mimari (üst katman)

```
[Kanallar: Web | WhatsApp | Instagram | SMS/NetGSM | Telefon/ElevenLabs]
        │  (webhook / inbound)
        ▼
[API Gateway: Next.js rewrite /api/* → localhost:3001/api/*]
        ▼
[Backend (NestJS) — global prefix /api]
   ├─ AI Motoru (DeepSeek/OpenAI prompt motoru, prompt sürümleme)
   ├─ İş Motorları (sipariş, ödeme, kampanya, şikayet, outbound)
   ├─ İzleme (channel health, arıza uyarısı, queue monitor)
   ├─ Destek (ticket, chatbot, alert router)
   ├─ KVKK (saklama temizliği, retention logları)
   └─ Backup/DR (şifreli yedek + restore testi)
        ▼
[Supabase (PostgreSQL + RLS tenant izolasyonu + Storage)]
```

- **Veri akışı:** gelen kanal → webhook idempotency → iş motoru → Supabase yazımı → panel bildirimi (outbound/SMS/WhatsApp).
- **Tenant izolasyonu:** tüm tenant-scoped tablolarda RLS + `tenant_id`; token ömrü ve API key yönetimi ile korunur.
- **DR:** yedek production'dan yalnızca okur, restore ayrı hedefe yazar (bkz. §8).

---

## 4. Modül Haritası

### Backend (`apps/api/src`) — ~50 controller, 55 servis

| Grup | Controller'lar |
|---|---|
| **Sipariş/Ödeme** | order-engine, order-processor, order-status, order-items, orders-list, payment-engine, order-status, sales-engine |
| **Müşteri/Ürün** | customers, customer-prices, products, contact, search |
| **Kanal entegrasyonu** | whatsapp-messages, whatsapp-templates, instagram, netgsm, webhook, outbound |
| **Kampanya/İletişim** | campaigns, notification-engine, notifications-api, iys |
| **Kargo** | cargo-tracking |
| **AI** | conversation, ai-audit-center, ai-test, replay, prompt (prompts) |
| **İzleme/Sağlık** | channel-health, health, queue-monitor, alert |
| **Destek** | support, complaint-processor |
| **Ses/Telefon** | voice, call (calls) |
| **KVKK** | kvkk |
| **Yönetim** | admin, saas, license, users, auth, settings, api-keys, onboarding |
| **Backup/DR** | backup |
| **Zaman çizelgesi/rapor** | timeline, activity-log, export, dashboard, reports (raporlar) |

### Frontend (`apps/web/src/app`) — ~23 sayfa

`admin, ai-audit, ai-test, api-keys, calls, complaints, customers, dashboard, health, integrations, login, marketing, notifications, onboarding, orders, products, prompts, reports, saas, settings, settings/audit-logs, support, users`

---

## 5. Geliştirme Geçmişi (Fazlar)

Kronolojik olarak projenin evrimi (git log'dan derlendi):

| Faz / Commit | Kazandırdığı yetenekler |
|---|---|
| **Faz 0** `b4c2a44` | Gönderim motoru (outbound worker + IYS + WhatsApp şablonları), WhatsApp kuyruğu |
| **Faz 1** `290dc05` | Kargo entegrasyonu: 6 firma adaptörü (Yurtiçi/Aras/MNG/DHL/Surat/Ptt), `kargo_integrations`, otomatik takip |
| **Faz 2** `601f299` | AI davranışı: fatura ayarına göre soru, moderasyon protokolü (küfür/hakaret), 3 deneme + WhatsApp daveti + yetkiliye aktar |
| **Faz 3** `b4fdb7b` | Birleşik şikayet hattı: `complaints`, 4 kanaldan tek noktaya kayıt, yazıcı, A4 fiş |
| **Faz 4** `696d1b9` | Kampanya yönetimi: toplu SMS/WhatsApp + IYS izin filtresi, doğum günü/bayram mesajları, WhatsApp şablon paneli |
| **Faz 5** `ac7d8da` | Ödeme bazlı esnaf bildirimi + dekont/link akışı, dashboard KPI modal modernizasyonu |
| **Kargo rotoş** `6459018` | Varsayılan firma + tek buton Kargoya Ver + 15dk poll + COD düzeltmeleri |
| **Kontrol** `e7e6603` | Canlı gradient ikonlar, Kargo Takibi modülü, ORDER_SHIPPED bildirimi, AI ödeme/kanal prompt kuralları |
| **CIRO/dashboard** `633591f` | Kanal bazlı ciro rozetleri, ödeme dağılımı, dün-kıyas rozetleri |
| **Faz 1+2+3** `dfcdb83` | Proaktif arıza uyarısı, per-esnaf sağlık, webhook idempotency, destek/ticket, AI destek, **RLS izolasyon**, prompt sürümleme, token ömür, KVKK retention monitor, per-esnaf maliyet |
| **Faz 4** `a16d302` | Owner arıza bildirimleri (e-posta/WhatsApp/SMS + toplulaştırma), admin ayar paneli |
| **Faz 5** `7bc9706` | Kapsamlı arıza izleme: AI cevap, web sipariş, WhatsApp grubu, Instagram, gelen mesaj akışları + latency/güven/insana devir/kuyruk/retry/kota taramaları |
| **Faz 6** `c6b2abd` | Akıllı destek asistanı (chatbot, rehber + canlı veri), telefon destek hattı (`support_phone`), acil destek bildirimi, admin destek metrikleri |
| **Probe/sessizlik** `1f6b73f`→`d915ec6` | Sessiz kanal uyarısı öncesi sağlık check (AI ping + anahtar kontrolü), eşik 15 dk |
| **Backup şifreleme + KVKK** `89c68aa` | AES-256 yedek, restore testi, KVKK retention genişletme (10y/10y/5y), admin yedekleme paneli, `056_recovery_kvkk.sql` |
| **Faz B+D (DR)** `6a0abe2` | `restore()` dry-run + güvenlik, güçlendirilmiş DR test (RLS+sipariş bütünlüğü), `/backup/status`, admin RPO/RTO metrikleri |
| **DR rehberi** `f152945` | `docs/DR_BACKUP_REHBERI.md` |

Ayrıca çok sayıda UI/UX iyileştirme commit'i: landing hero iterasyonları, dark mode, SAAS UX dönüşümü, sidebar/topbar, ciro modalları, migrasyon paketleri (038–041, 042–045).

---

## 6. Veritabanı (Supabase)

- **58 SQL migrasyon dosyası** (`database/001..056`, bazıları alt paketler halinde).
- Migrasyon kayıt mekanizması yok; her `.sql` elle / Supabase SQL Editor'dan çalıştırılır.
- **Önemli yeni tablolar:**
  - `recovery_logs` — DR restore testi sonuçları (056)
  - `retention_logs` — KVKK saklama temizliği kaydı (053)
  - `channel_health` / `channel_health_events` / `channel_health_alerts` (047)
  - `webhook_events` (048), `support_tickets` (049), `prompt_versions` (051), `support_chat_*` (055)
  - `kargo_integrations` (039), `complaints` (040), `api_keys` (016/021)
- **Tenant izolasyonu:** `tenant_settings`, `tenants`, `users`, tüm tenant-scoped iş tabloları → RLS.
- **KVKK saklama kolonları** (`tenant_settings`): `recording_retention_days`(90), `audit_log_retention_days`(3650), `transcript_retention_days`(3650), `message_retention_days`(3650), `activity_log_retention_days`(1825).

---

## 7. Ortam Değişkenleri (`apps/api/.env`)

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `SUPABASE_URL` | ✅ | Supabase proje URL |
| `SUPABASE_SERVICE_KEY` | ✅ | Service role key |
| `SUPABASE_ANON_KEY` | ✅ | Anon key |
| `PORT` / `API_URL` | ✅ | 3001 / `http://localhost:3001` |
| `BACKUP_ENCRYPTION_KEY` | ✅ | AES-256 yedek anahtarı (yoksa backup çalışmaz) |
| `DEEPSEEK_API_KEY` / `OPENAI_API_KEY` | ✅ | AI sağlayıcıları |
| `ELEVENLABS_API_KEY` | ✅ | Ses/voice |
| `NETGSM_USERNAME/PASSWORD/MSG_HEADER` | ✅ | SMS |
| `SENTRY_DSN` / `SENTRY_TRACES_SAMPLE_RATE` | ⬜ | Crash monitoring |
| `DR_TARGET_URL` / `DR_TARGET_KEY` | ⬜ | DR restore hedefi (ayrı Supabase projesi) |

---

## 8. Yedekleme & DR

Özet (detay: **`docs/DR_BACKUP_REHBERI.md`**):
- **Backup:** günlük (cron 04:00), 30+ tablo, **sayfalama** ile tam çekim, **AES-256-CBC şifreli**, `storage_files` manifest.
- **DR testi (`runRestoreTest`):** dosyayı in-memory doğrular — tenant/müşteri/sipariş, RLS izolasyonu, sipariş bütünlüğü; sonucu `recovery_logs`'a yazar. **Canlı sisteme dokunmaz.**
- **Restore (`restore`):** hedef `DR_TARGET_*` env'den; env yoksa `dry-run`, hedef=prod ise iptal. **Prod'a yazma kod seviyesinde kapalı.**
- **Metrikler:** RPO ≤ 24s, RTO ≤ 2s; admin panelinde Son Backup 🟢 / Son Restore Testi / RPO / RTO.

---

## 9. KVKK / Saklama Süreleri

| Veri | Süre | İşlem |
|---|---|---|
| Ses kaydı (`call_recordings`) | 90 gün (varsayılan) | sil |
| AI denetim (`ai_audit_logs`) | 10 yıl | sil |
| Transcript (`conversation_sessions`) | 10 yıl | içerik boşaltılır |
| WhatsApp mesajları | 10 yıl | sil |
| Instagram mesajları | 10 yıl | sil |
| Aktivite logları | 5 yıl | sil |

Otomatik temizlik: `kvkk.service.ts`, `auto_cleanup_enabled` olan tenant'larda çalışır; sonuç `retention_logs`'a yazılır.

---

## 10. Güvenlik & İzolasyon

- **RLS tenant izolasyonu:** tenant-scoped tablolarda satır düzeyi izolasyon; DR testinde otomatik doğrulanır.
- **Token ömrü:** oturum token'ları süreli (052).
- **API key yönetimi:** `api_keys` modülü (016/021).
- **Webhook idempotency:** tekrarlı webhook'lar tek işleme çevrilir.
- **DR restore güvenliği:** prod URL engelli, env yoksa dry-run, canlı AI çağrısı testte yok.
- **Secret'lar:** `.env` git-ignore; `BACKUP_ENCRYPTION_KEY` zorunlu.

---

## 11. Yapılacaklar / Açık İşler

- [ ] **Gerçek DR restore testi:** ayrı Supabase test projesi oluştur, `DR_TARGET_URL/KEY`'i test projesine yönlendir (rehber §10).
- [ ] **Aylık restore testi cron'u:** `runRestoreTest`'i aylık otomatik çalıştır (rehber hedefi).
- [ ] **Off-site / S3 yedekleme:** VPS dışı güvenli dış konuma yedek taşıma (opsiyonel, ölçeklenmede).
- [ ] **Secret yönetimi:** `api_keys` içeriğini düz metin backup'tan çıkar / ayrı şifreli tut.
- [ ] **Eski dokümanları güncelle:** `MASTER_PLAN.md`, `SYSTEM_ARCHITECTURE.md` placeholder/eskimiş durumda.
- [ ] **B/C karar kaydı:** gerekirse geçmişten (opencode.db) kronolojik değişiklik/karar kaydı çıkar.

---

## 12. Doküman Dizini (`docs/`)

| Dosya | Rol |
|---|---|
| **PROJE_DURUM.md** | Bu dosya — proje haritası, başlangıç noktası |
| **DR_BACKUP_REHBERI.md** | Yedekleme & felaket kurtarma derinlemesine |
| **Kurulum.md** / **Deployment.md** | Kurulum ve deploy |
| **api.md** / **API_LIST.md** | API detayları / endpoint listesi |
| **Database.md** / **DATABASE_SCHEMA.md** | Veritabanı şeması |
| **architecture.md** / **SYSTEM_ARCHITECTURE.md** | Mimari (eskimiş — §3'ü tercih et) |
| **PROMPT_ENGINE.md** | AI prompt motoru |
| **conversation-rules.md** | Konuşma kuralları |
| **MASTER_PLAN.md** | Eski vizyon (placeholder) |
| **MVP_ROADMAP.md** / **OLCEKLEME_GUVENILIRLIK_REHBERI.md** | Yol haritası / ölçekleme rehberi |
| **ornekbu.png** / **ornekbu2.png** | Örnek görseller |

---

### Nasıl kullanılır
1. Yeni görev için §4'ten ilgili modülü bul.
2. Değişiklik gerekirse ilgili migrasyonu (§6) ve env'i (§7) kontrol et.
3. Güvenlik/kvkk/dr ile ilgiliyse §8–10 ve referans dokümanlarını oku.
4. Bittiğinde "Yapılacaklar" listesini (§11) güncelle.
