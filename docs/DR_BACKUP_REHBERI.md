# Yedekleme & Felaket Kurtarma (DR) Rehberi

Bu belge, SiparişAsistanı'nın **yedekleme (backup)** ve **felaket kurtarma (disaster recovery)** sisteminin nasıl çalıştığını, hangi güvenlik garantilerini verdiğini ve nasıl kurulup doğrulandığını açıklar.

---

## 1. Neden bu sistem var?

Eski yedekleme modülü yalnızca "backup al + listele + indir" yapıyordu; şu kritik eksikleri vardı:

| Eksik | Sonuç |
|---|---|
| Tablo başına **5000 satır limiti** | 100 esnafta `orders`/`customers` sessizce eksik yedeklenirdi |
| **Şifreleme yok** | Backup düz metin JSON — sızarsa tüm veri okunurdu |
| **Yeni tablolar backup'ta yok** | `channel_health`, `support_*`, `prompt_versions`, `webhook_events` vb. kurtarılamazdı |
| **Restore fonksiyonu yok** | Yedek almak ≠ yedek'e sahip olmak; veriyi geri yazacak hiçbir kod yoktu |
| **Restore testi yok** | Yedeğin kurtarılabilir olduğu hiç doğrulanmıyordu |

Bu rehber, bu boşlukların kapatıldığı **Faz A/B/C/D** paketini ve nasıl çalıştığını anlatır.

---

## 2. Mimariye genel bakış

```
PRODUCTION (canlı Supabase)            TEST / DR ORTAMI (ayrı, opsiyonel)
  ─ esnaflar çalışır ─                 ─ izole, kimse kullanmaz ─
  ─ hiç dokunulmaz ─                   ─ DR_TARGET_URL/DR_TARGET_KEY ─
        │
        │  (1) Yedek: SADECE okur (export)
        ▼
  backups/backup-<TS>.json  ─────────►  (2) Restore: DR ortamına yazar
        │                                 (env tanımlı değilse dry-run)
        │  (3) DR test: dosyayı okur, in-memory doğrular
        ▼
  recovery_logs (sonuç kaydı)
```

**Ana prensip:** Yedek, production'dan **sadece okur**. Restore, **yalnızca ayrı bir hedef ortama** yazar. Canlı sisteme yazma yolu kodda **kapalıdır** (bkz. güvenlik sözleşmesi).

---

## 3. Faz A — Backup güçlendirme (`backup.service.ts`)

### 3.1 Tüm tablolar + sayfalama
- Tablo listesi kritik yeni tablolarla genişletildi:
  `channel_health`, `channel_health_events`, `channel_health_alerts`, `support_tickets`,
  `support_ticket_messages`, `support_chat_sessions`, `support_chat_messages`,
  `prompt_versions`, `webhook_events`, `retention_logs`, `outbound_logs`,
  `complaints`, `api_keys`, `subscriptions`.
- `fetchAllRows()`: `range()` ile **sayfalama** yapar (1000'er kayıt), 5000 limiti kaldırıldı →
  büyük tablolarda artık **eksiksiz** yedek alınır.

### 3.2 Şifreleme (AES-256-CBC)
- Backup **her zaman şifreli** yazılır: `ivHex:cipherHex` formatı.
- Anahtar `BACKUP_ENCRYPTION_KEY` env'inden alınır.
- **Zorunlu**: anahtar yoksa `runBackup` hata fırlatır (bilinen varsayılan anahtarla zayıf şifreleme engellendi).
- `readBackup()` hem şifreli hem eski düz-JSON dosyaları okur (geriye dönük uyumlu).

### 3.3 Storage (ses kayıtları)
- `storage_files` alanı: `call_recordings.recording_url` listesi manifest olarak yedek'e eklenir.
- Ses kayıtları çoğunlukla dış URL / mock olduğu için gerçek dosya indirme yapılmaz;
  URL manifest, restorasyon sonrası dosyaların nerede olduğunu doğrulamaya yeter.

---

## 4. Faz B — Restore + DR testi

### 4.1 `restore(filename)` — güvenlik sözleşmesi
Yedek verisini **hedef ortama** geri yazar. Şu korumalar **kod seviyesinde** zorunludur:

| Durum | Davranış |
|---|---|
| `DR_TARGET_URL`/`DR_TARGET_KEY` **yok** | `dry-run` sonucu döner — **hiçbir şey yazılmaz** |
| Hedef URL = `SUPABASE_URL` (production) | **İptal** (`blocked`) — prod'a yazma engellendi |
| Hedef URL ayrı bir proje | `upsert(id)` ile tablolara yazar |

- Yazma sırası `insertionOrder()` ile FK bağımlılığına göre belirlenir (parent tablolar önce).
- `onConflict: 'id'` ile tekrar eden kayıtlar üzerine yazılır (idempotent).

### 4.2 `runRestoreTest(filename)` — otomatik DR doğrulaması
Backup dosyasını okur ve **canlı sisteme dokunmadan** şu kontrolleri yapar:

1. **Tenant sayısı** — `tenants`
2. **Müşteri sayısı** — `customers`
3. **Sipariş sayısı** — `orders`
4. **Tenant–müşteri bağlantısı** — kaç farklı tenant'a müşteri bağlı
5. **Sipariş toplamı** — toplam tutar + fiyatlı sipariş adedi
6. **Aktif prompt** — `prompt_versions` içinde `status='active'`
7. **Storage manifest** — `storage_files` sayısı
8. **RLS izolasyonu** — tenant_id taşıyan tablolarda tenant_id'siz satır olmamalı
9. **Sipariş veri bütünlüğü** — zorunlu alanlar (`id`, `customer_id`) + geçerli fiyat

Sonuç `recovery_logs` tablosuna yazılır (`status: success | failed`).
**Canlı AI çağrısı yapılmaz** → gerçek müşterilere mesaj gitme riski yok.

---

## 5. Faz C — KVKK saklama

Migration `database/056_recovery_kvkk.sql` uygulanınca:

- `tenant_settings`'e 3 yeni kolon:
  - `transcript_retention_days` (varsayılan 3650 = 10 yıl)
  - `message_retention_days` (varsayılan 3650 = 10 yıl)
  - `activity_log_retention_days` (varsayılan 1825 = 5 yıl)

`kvkk.service.ts` otomatik temizlik artık şunları kapsar:

| Veri | Süre | İşlem |
|---|---|---|
| Ses kaydı (`call_recordings`) | 90 gün (varsayılan) | sil |
| AI denetim (`ai_audit_logs`) | 10 yıl | sil |
| Transcript (`conversation_sessions` içerik) | 10 yıl | içerik boşaltılır |
| WhatsApp mesajları | 10 yıl | sil |
| Instagram mesajları | 10 yıl | sil |
| Aktivite logları | 5 yıl | sil |

---

## 6. Faz D — Admin paneli

`/admin` sayfasındaki **"Yedekleme & Kurtarma (DR)"** kartı:

- **Yedek Oluştur** butonu → `/api/backup/run`
- Yedek listesi (dosya adı, tarih, boyut) + her satırda **Restore Test** butonu
- **Sağlık metrikleri** (`/api/backup/status`):
  - **Son Backup** 🟢 Sağlıklı / 🟡 Gecikmiş / 🔴 Yok
  - **Son Restore Testi** ✅ OK / ⚠️ Test edilmedi
  - **RPO hedefi** ≤ 24 saat (günlük yedek)
  - **RTO hedefi** ≤ 2 saat
- **Son Restore Test Sonuçları** (success/fail + tenant/sipariş sayıları)

---

## 7. API endpoint'leri

| Metot | Yol | Açıklama |
|---|---|---|
| GET | `/api/backup/run` | Yedek oluştur (şifreli) |
| GET | `/api/backup/list` | Yedek dosyalarını listele |
| GET | `/api/backup/download/:file` | Yedek dosyasını indir |
| GET | `/api/backup/restore-test/:file` | DR testi çalıştır (in-memory) |
| GET | `/api/backup/restore/:file` | DR ortamına geri yaz (dry-run güvenli) |
| GET | `/api/backup/status` | Backup sağlık özeti (RPO/RTO) |

---

## 8. Ortam değişkenleri

`.env.example`'a eklendi:

```env
# ZORUNLU — yoksa yedekleme çalışmaz (güçlü anahtar: openssl rand -hex 32)
BACKUP_ENCRYPTION_KEY=...

# OPSİYONEL — restore testi için AYRI Supabase projesi
DR_TARGET_URL=https://xxxx.supabase.co
DR_TARGET_KEY=service_role_key_buraya
```

- `BACKUP_ENCRYPTION_KEY` set değilse → `runBackup` hata verir (bilinçli tasarım).
- `DR_TARGET_URL` set değilse → `restore()` `dry-run` döner (prod güvende).
- `DR_TARGET_URL` = `SUPABASE_URL` ise → `restore()` iptal edilir.

---

## 9. Veritabanı migration

`database/056_recovery_kvkk.sql` (uygulandı, doğrulandı):

```sql
create table if not exists recovery_logs (...);           -- DR test sonuçları
create index if not exists idx_recovery_logs_ran ...;
alter table tenant_settings add column if not exists transcript_retention_days ...;
alter table tenant_settings add column if not exists message_retention_days ...;
alter table tenant_settings add column if not exists activity_log_retention_days ...;
```

> "No rows returned" DDL için normal bir başarı mesajıdır.

---

## 10. Gerçek DR kurulumu (üretimde)

1. **Ayrı bir Supabase test projesi** oluştur (üretimden tamamen bağımsız).
2. Aynı şemayı test projesine uygula (`all_migrations.sql` / Supabase dump).
3. `DR_TARGET_URL` + `DR_TARGET_KEY`'i **test projesinin** kimlikleriyle set et (asla prod service key değil).
4. `/api/backup/restore/<dosya>` çağır → `mode: restored`.
5. `/api/backup/restore-test/<dosya>` ile doğrula.

**Uyarı:** Test ortamında gerçek provider anahtarlarını (NetGSM/WhatsApp) kullanma —
test müşterilerine istenmeyen mesaj gider.

---

## 11. Hedef metrikler

| Metrik | Değer |
|---|---|
| RPO (kabul edilebilir veri kaybı) | ≤ 24 saat |
| RTO (kurtarma süresi) | ≤ 2 saat |
| Backup | Günlük (cron 04:00) |
| Restore testi | Aylık (hedef) |

---

## 12. Doğrulama / test özeti

Gerçek ortamda (port 3101, üretim portuna dokunmadan) yapılan canlı doğrulamalar:

- **`/api/backup/status`** → `backup_healthy: true`, RPO=24, RTO=2 ✅
- **`/api/backup/restore/:file`** (DR env yok) → `dry-run`, yazma yok ✅
- **`/api/backup/restore-test/:file`** (gerçek 12 MB yedek) →
  `success: true` — 7 tenant, 22 müşteri, 120 sipariş, RLS sorun 0, sipariş bütünlüğü 0 hatalı ✅
- `recovery_logs`'a `success` kaydı yazıldı ✅
- `apps/api` + `apps/web`: `tsc --noEmit` **exit 0**, `nest build` **exit 0** ✅

---

## 13. Sık sorulan sorular

**Restore testi esnafın sistemini etkiler mi?**
Hayır. `runRestoreTest` yalnızca yedek **dosyasını okur** ve hesaplamayı bellekte yapar.
Canlı veritabanına hiçbir yazma yapmaz (yalnızca `recovery_logs` log tablosuna sonuç ekler).

**Gerçek `restore()` çalıştırınca esnaf etkilenir mi?**
Hayır. `restore()` yalnızca `DR_TARGET_URL`'e yazar ve bu URL'nin production'dan farklı olduğunu
**kod seviyesinde** garanti eder. Env yoksa yazma zaten engellenir.

**Anahtar kaybolursa ne olur?**
Şifreli yedekler çözülemez. Bu yüzden `BACKUP_ENCRYPTION_KEY`'i güvenli bir yerde (ör. secret manager)
sakla; DR planının bir parçası olarak yedekle.

---

*Oluşturulma: Faz A (backup güçlendirme) + Faz B (restore/DR test) + Faz C (KVKK) + Faz D (admin paneli).*
