# Supabase Log Ingestion Azaltma Rehberi

Bu doküman, Supabase **Log Ingestion** kullanımını (mevcut durumda 4,1 GB / 1 GB) azaltmak için uygulanacak adımları içerir.

Önemli: Log Ingestion, uygulamanın `ai_audit_logs` tablosu değildir. Supabase platformunun ürettiği **Postgres, API, Auth, Storage, Realtime ve Edge** loglarının toplamıdır. Uygulama tablolarını silmek bu kotayı doğrudan düşürmez.

## 1. Önce kaynağı gör

Supabase Dashboard:

1. `Reports > Logs` veya `Settings > Usage`
2. **Log Ingestion** grafiğini incele.
3. Hangi servis baskın:
   - Postgres
   - API
   - Auth
   - Storage
   - Realtime
   - Edge Functions

Bu ayrım yapılmadan log seviyesini körlemesine kapatmak hata ayıklamayı zorlaştırır.

## 2. Postgres log seviyesi

Supabase SQL Editor'de (önce yedek/plan notu al):

```sql
-- Yalnızca yavaş sorguları logla (1 saniye ve üzeri)
alter system set log_statement = 'none';
alter system set log_min_duration_statement = 1000;
select pg_reload_conf();
```

Kontroller:

```sql
show log_statement;
show log_min_duration_statement;
```

Notlar:
- `log_statement = 'all'` veya çok düşük `log_min_duration_statement` değerleri log hacmini çok artırır.
- Tamamen kapatmak yerine **1 sn üzeri** sorguları bırakmak dengeli bir seçenektir.
- Değişiklik sonrası birkaç saat/gün Log Ingestion grafiğini izle.

## 3. API / Auth / Storage logları

- Supabase Dashboard'da **Log Drains** varsa gereksiz olanları kapat.
- Kalıcı log saklama süresini ihtiyaca göre azalt.
- Free planda log saklama süresi kısa; Pro'da daha uzundur.
- Uygulama tarafında gereksiz istek/polling varsa azalt: bu hem egress hem log ingestion'ı düşürür.

## 4. Uygulama tarafında log/istek azaltma

- Panel polling sürelerini artır (bildirim/ses 15 sn → 60 sn).
- AI audit istatistiklerinde ağır alanları çekme; son 7 gün + limit kullan.
- Çağrı listesinde mesaj geçmişini çekme; detayı sadece tıklanınca yükle.
- Kayıtları otomatik oynatma; `preload="none"` kullan.
- Eski teknik loglar için retention uygula (ayrı doküman).

## 5. Ne zaman Pro?

- Free plan: 1 GB log ingestion.
- Pro plan: çok daha yüksek log ingestion ve 250 GB egress.
- Uygulama testte 4,1 GB log ürettiyse Free plan sürdürülebilir değil.
- Canlıya geçişte Pro plan + log seviyesi optimizasyonu birlikte düşünülmeli.

## 6. Riskler

- Log seviyesini tamamen kapatmak: hata ayıklama ve güvenlik izleme kaybı.
- Log drain'leri kapatmak: dış izleme/alert kaybı.
- Sadece log ayarına güvenmek: uygulama çok istek üretiyorsa log ingestion yine yükselir.
- Değişiklik sonrası hemen sonuç beklemek: Supabase kullanım verileri gecikmeli yenilenebilir.

## 7. Öneri

1. Önce `Reports > Logs` ile baskın servisi belirle.
2. Postgres için 1 sn üzeri yavaş sorgu logunu bırak.
3. Panel/AI isteklerini azalt.
4. Canlıda Pro plan kullan.
5. 20 Kasım reset sonrası 1 hafta Log Ingestion grafiğini izle.
