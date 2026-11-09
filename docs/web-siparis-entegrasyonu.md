# Web Sitesi Sipariş Entegrasyonu

Bu belge, web sitesi sipariş entegrasyonu için **tek kaynaktır**. Web sipariş/entegrasyon sorularında önce bu dosya okunur; buradaki kararlar geçerlidir.

## 1) Özet
İki entegrasyon yolu vardır:

- **A) Uyumlu platformlar (WooCommerce / Shopify / Ideasoft / Ticimax):** Tamamen **self-service**. Her esnaf kendi panelinden bağlar; her esnaf için ayrı kod yazılmaz.
- **B) Uyumsuz/özel yazılım sitesi:** **Bir kerelik** küçük entegrasyon. Esnafın web geliştiricisi (veya biz) `custom` webhook'a standart JSON gönderir. Sonrası tekrar eden iş değildir.

Kısaca: uyumlu platformlarda esnaf kendi kendine kısa sürede bağlar; özel sitelerde tek seferlik ufak bir iş olur. **Her esnafta ayrı uğraş yoktur.**

## 2) A) Uyumlu platformlar — self-service akış
Esnaf panelde **Entegrasyonlar → Web Sitesi** bölümüne girer:

1. Platformu seçer (WooCommerce / Shopify / Ideasoft / Ticimax / Özel Yazılım).
2. Panelde kendi tenant'ına özel **webhook URL**'sini kopyalar:
   - `/api/webhook/woocommerce/:tenantId`
   - `/api/webhook/shopify/:tenantId`
   - `/api/webhook/ideasoft/:tenantId`
   - `/api/webhook/ticimax/:tenantId`
   - `/api/webhook/custom/:tenantId`
3. URL'yi (ve eklenecek tenant secret'ı) kendi e-ticaret platformunun webhook ayarına yapıştırır.
4. Sipariş olaylarını seçer: **create / update / cancel**.
5. Panelde **Test Et** ile doğrular; son event/durum görünür.
6. Siparişler panele düşer; sesli AI çalışan + WhatsApp grubu + panel zili + yazıcı + panel aktif siparişler çalışır.

Her esnaf için kod yazılmaz; yalnızca URL/secret tenant'a özeldir.

## 3) B) Özel/uyumsuz site — standart JSON
Web geliştiricisi `POST /api/webhook/custom/:tenantId` adresine şu JSON'u gönderir:

```json
{
  "id": "benzersiz-event-id",
  "order_number": "WEB-1001",
  "customer_name": "Ad Soyad",
  "customer_phone": "905xxxxxxxxx",
  "address": "Mahalle, sokak, no",
  "city": "İstanbul",
  "district": "Kadıköy",
  "payment_method": "website",
  "items": [
    { "name": "Kangal Sucuk", "quantity": 2, "unit": "KG", "price": 750 }
  ]
}
```

- `id` benzersiz olmalı; aynı `id` tekrar gelirse idempotency duplicate döner.
- Sipariş panele **iç 26-xxxx numarası** ile düşer; web sitenizin sipariş numarası `customer_note` içinde referans olarak saklanır.
- Kanal **WEB**, kaynak **WEBSITE** olur; sesli bildirimde **WEB** etiketi kullanılır.

## 4) Mevcut durum
- Webhook çekirdeği hazır: WooCommerce / Shopify / Ideasoft / Ticimax / custom uçları + `webhook_events` idempotency.
- Siparişler ortak sipariş oluşturma hattına giriyor: iç **26-xxxx**, `channel=web`, `source=WEBSITE`.
- Sesli AI çalışan, WhatsApp grubu, panel zili, yazıcı ve panel aktif siparişler bu siparişlerde çalışıyor.
- Panel: web sitesi URL alanı + webhook URL listesi + kopyalama var.
- Test aracı: `scripts/webhook-test.ps1`.

## 5) Canlı self-service için kalanlar
- Tenant bazlı **webhook secret/imza** ve panelde üret/kopyala.
- Panelde **Test Et**, son event ve bağlantı durumu.
- Ideasoft/Ticimax özel payload mapping'i.
- Webhook **update/cancel** olayları (şu an create ağırlıklı).
- `website_url` / `kvkk_url` alanlarının esnaf tarafından doldurulması.
- Bu doküman tamamlandı; kurulum dokümanı ayrıca aranmaz.

## 6) Test
Repo kökünden:

```powershell
cd C:\SiparisAsistani
powershell -ExecutionPolicy Bypass -File .\scripts\webhook-test.ps1 -Product "Manda Sucuk" -Quantity 2 -Price 1600 -City "Ankara" -District "Çankaya"
```

Her yerden mutlak yol:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\SiparisAsistani\scripts\webhook-test.ps1" -Product "Manda Sucuk" -Quantity 2 -Price 1600 -City "Ankara" -District "Çankaya"
```

- Script her çalıştırmada benzersiz `EventId` üretir; aynı id tekrar kullanılmamalıdır.
- Beklenen yanıt: `status: "created"`, iç `order_number` (26-xxxx), `external_order_number` (web sipariş no).
- Kontrol: Panel → Siparişler (kanal WEB), Panel → Bildirimler, `ai_voice_notifications`, `ai_events` (`whatsapp_group_sent`).
- Test siparişleri gerçek sipariş değildir; panelden iptal edilebilir.

## 7) Sık sorular
- **Her esnafta uğraşacak mıyız?** Hayır. Uyumlu platformlarda self-service; özel sitelerde bir kerelik entegrasyon.
- **Esnafın web sitesi uyumlu değilse?** `custom` JSON ile tek seferlik; istenirse hazır JS snippet/plugin.
- **Sipariş numarası hangisi?** İç `26-xxxx`; web sitenizin numarası referans olarak `customer_note` içinde.
- **Canlıya geçiş?** Secret/test/update-cancel tamamlanınca panelden self-service bağlantı açılır.
