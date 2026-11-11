# Esnaf WhatsApp ve SMS Kurulum Rehberi

Bu doküman, SiparişAsistanı'nı satın alan her esnafın **kendi WhatsApp Business hesabı** ve **kendi SMS hesabı** ile sistemi canlıya alması için hazırlanmıştır.

Amaç: Test bittikten sonra her esnaf için kurulumu hızlı ve tekrarlanabilir şekilde tamamlamak. Meta şablon onayları ve SMS başlık/KEP işlemleri esnafın kendi hesabında yapılır; platform tarafında kod hazırdır.

---

## 1. Ön koşullar

### WhatsApp için
- Esnafın işletme bilgileri ve telefon numarası
- Meta Business Portfolio (Business Manager) hesabı
- WhatsApp Business Account (WABA)
- WhatsApp Cloud API erişimi
- Onaylı mesaj şablonu için Meta Business doğrulaması

### SMS için
- NetGSM veya Verimor hesabı
- Onaylı SMS başlığı (sender ID)
- KEP adresi
- İYS kaydı ve müşteri izinleri
- SMS API kullanıcı bilgileri

> Önemli: Telefondaki **WhatsApp Business uygulaması** API gönderimi için yeterli değildir. Otomatik gönderim için **WhatsApp Cloud API/WABA** gerekir. Sadece uygulama varsa panelden `wa.me` manuel gönderim kullanılır.

---

## 2. WhatsApp Cloud API kurulumu (esnaf hesabı)

### 2.1 Meta Business Portfolio
1. `business.facebook.com` üzerinden esnafın işletme hesabını oluştur veya mevcut hesaba gir.
2. İşletme bilgilerini doldur ve **Business Verification** başlat.
3. Doğrulama tamamlanmadan bazı mesaj limitleri düşük kalır; canlı gönderim öncesi tamamlanmalı.

### 2.2 Meta uygulaması ve WhatsApp ürünü
1. `developers.facebook.com` üzerinden **Business** tipinde uygulama oluştur.
2. Uygulamaya **WhatsApp** ürününü ekle.
3. Uygulamayı esnafın Business Portfolio hesabına bağla.

### 2.3 Telefon numarası ve WABA
1. WhatsApp > API Setup bölümünde esnafın numarasını ekle.
2. Numara doğrulamasını SMS veya sesli arama ile tamamla.
3. Görünen adı (display name) işletme adıyla uyumlu gir.
4. Aşağıdaki bilgileri not et:
   - **Phone Number ID**
   - **WhatsApp Business Account ID (WABA ID)**
   - Görünen numara

### 2.4 Kalıcı erişim token'ı
1. Meta Business Settings > Users > **System Users** bölümüne gir.
2. Yeni bir system user oluştur (Admin veya Employee).
3. Uygulamayı ve WhatsApp hesabını bu kullanıcıya ata.
4. İzinler:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. **Generate Token** ile kalıcı token oluştur.
6. Token yalnızca güvenli yerde saklanır; repoya veya dokümana yazılmaz.

### 2.5 Ödeme yöntemi ve limitler
1. WABA'ya kredi kartı/ödeme yöntemi ekle.
2. Mesajlaşma limitini ve kalite puanını kontrol et.
3. Test numarası kullanılıyorsa yalnızca test alıcı listesindeki numaralara gönderim yapılabilir.

---

## 3. Platforma WhatsApp bilgilerini girme

Her tenant için `api_keys` tablosunda `meta_whatsapp` kaydı gerekir:

| Alan | Değer |
|---|---|
| `provider` | `meta_whatsapp` |
| `api_key` | Kalıcı erişim token'ı |
| `api_secret` | Phone Number ID |
| `extra_config.waba_id` | WABA ID |

Panelde entegrasyonlar sayfası varsa aynı bilgiler oradan girilebilir. Giriş sonrası:

1. WhatsApp kanal sağlığını kontrol et.
2. Test mesajı gönder.
3. `outbound_logs` kaydında `provider = meta_whatsapp` ve `status = sent` görülmeli.
4. Hata varsa hata kodu ve mesajı kontrol edilir.

### Webhook
1. Meta uygulamasında WhatsApp > Configuration > Webhook:
   - Callback URL: platformun `/api/whatsapp/webhook` adresi
   - Verify Token: platformun `WHATSAPP_VERIFY_TOKEN` değeri
2. `messages` alanına abone ol.
3. Webhook doğrulamasını tamamla.

---

## 4. 24 saat kuralı ve `payment_info` şablonu

WhatsApp'ta müşteri işletmeye mesaj yazdığında **24 saatlik müşteri hizmetleri penceresi** açılır. Bu süre içinde serbest metin gönderilebilir. Süre dolduktan sonra işletme ancak **onaylı şablon** ile mesaj başlatabilir.

### 4.1 Şablon oluşturma
Meta > WhatsApp Manager > Message Templates:

- Ad: `payment_info`
- Kategori: **Utility**
- Dil: **Türkçe (tr)**
- Gövde örneği:

```text
Sayın {{1}}, siparişiniz için havale/EFT bilgileri aşağıdadır.
Tutar: {{2}}
IBAN: {{3}}
Dekontu ilettiğinizde siparişiniz onaylanacak. Sipariş numaranız dekont onayından sonra iletilecek.
```

Değişken sırası:
1. Müşteri adı
2. Tutar
3. IBAN

> Şablona sipariş numarası eklenmez. IBAN'lı siparişlerde sipariş numarası dekont onayından sonra verilir.

### 4.2 Onay
1. Şablonu Meta'ya gönder.
2. Durum `approved` olana kadar bekle.
3. Platformdaki `whatsapp_templates` kaydı `status = approved` olmalı.
4. Onaylanmadan şablon gönderimi çalışmaz; serbest metin de 24 saat dışında çalışmaz.

### 4.3 Gönderim sırası
Kod şu sırayı dener:
1. Serbest WhatsApp metni
2. Onaylı `payment_info` şablonu
3. SMS
4. Hiçbiri olmazsa esnaf panele manuel gönderim uyarısı

Müşteriye "gönderemedim/hata" denmez. Gerekirse:

```text
xxx Bey/Hanım, efendim hesap bilgilerini işletmemiz sizlere iletecek.
```

---

## 5. SMS kurulumu (KEP sonrası)

### 5.1 Sağlayıcı
- NetGSM veya Verimor hesabı açılır.
- Esnaf adına onaylı SMS başlığı alınır.
- KEP adresi alınır.
- İYS kaydı ve ticari ileti izinleri tamamlanır.

### 5.2 API bilgileri
Sağlayıcıya göre kullanıcı adı, şifre, API anahtarı ve başlık bilgileri alınır. Bu bilgiler tenant bazlı saklanır; repoya yazılmaz.

### 5.3 Platforma tanımlama
1. Tenant'ın SMS sağlayıcı bilgilerini `api_keys`/entegrasyon ayarlarına gir.
2. Gönderici başlığını ayarla.
3. Test SMS gönder.
4. `outbound_logs` kaydında `channel = sms` ve `status = sent` görülmeli.

### 5.4 SMS aktif olana kadar
SMS henüz aktif değilse:
- AI müşteri "WhatsApp yok" derse "SMS ile göndereceğim" diyebilir.
- Gönderim yapılamazsa müşteriye hata söylenmez.
- Müşteriye "hesap bilgilerini işletmemiz sizlere iletecek" denir.
- Esnafa panel bildirimi gider.

---

## 6. WhatsApp Business uygulaması varsa

Esnaf yalnızca telefonundaki WhatsApp Business uygulamasını kullanıyorsa:
- API'den otomatik gönderim yapılamaz.
- Panelde `wa.me` manuel gönderim bağlantısı oluşturulur:
  `https://wa.me/905XXXXXXXXX?text=...`
- Esnaf bağlantıya dokunarak mesajı kendi WhatsApp'ından gönderir.
- Bu yöntemde otomatik teslim durumu ve 24 saat yönetimi yoktur.

Otomatik gönderim isteniyorsa Cloud API/WABA kurulumu zorunludur.

---

## 7. Tenant onboarding kontrol listesi

### WhatsApp
- [ ] Meta Business Portfolio doğrulandı
- [ ] WABA oluşturuldu
- [ ] Telefon numarası doğrulandı
- [ ] Phone Number ID alındı
- [ ] WABA ID alındı
- [ ] Kalıcı system user token oluşturuldu
- [ ] İzinler verildi
- [ ] Platformda `api_keys.meta_whatsapp` kaydı yapıldı
- [ ] Webhook doğrulandı
- [ ] Test mesajı gönderildi
- [ ] `payment_info` şablonu oluşturuldu
- [ ] Şablon Meta tarafından onaylandı
- [ ] `whatsapp_templates` kaydı `approved`
- [ ] 24 saat içi serbest metin testi yapıldı
- [ ] 24 saat dışı şablon testi yapıldı

### SMS
- [ ] NetGSM/Verimor hesabı açıldı
- [ ] SMS başlığı onaylandı
- [ ] KEP adresi alındı
- [ ] İYS kaydı tamamlandı
- [ ] API bilgileri platforma girildi
- [ ] Test SMS gönderildi
- [ ] `outbound_logs` içinde `sent` görüldü

### Platform
- [ ] Telefon numarası E.164 (`905...`) gönderim testi
- [ ] IBAN siparişi otomatik gönderim testi
- [ ] WhatsApp yok senaryosu
- [ ] SMS yok/hata senaryosu
- [ ] Panelde manuel gönderim uyarısı
- [ ] AI'nın müşteriye hata söylemediği doğrulandı

---

## 8. Sık karşılaşılan hatalar

### `#131030 Recipient phone number not in allowed list`
- Test numarası kullanılıyor.
- Alıcı, Meta test alıcı listesine eklenmemiş.
- Çözüm: Test alıcısını ekle veya canlı WABA numarasına geç.
- Numara formatı `905...` olmalı.

### 24 saat / yeniden etkileşim hatası
- Müşteri son 24 saatte yazmamış.
- Çözüm: Onaylı `payment_info` şablonu gönder veya müşterinin önce yazmasını sağla.

### `SMS_NOT_CONFIGURED`
- Tenant'ın SMS sağlayıcı bilgileri yok.
- Çözüm: NetGSM/Verimor bilgilerini gir; başlık onayını tamamla.

### WhatsApp gönderildi ama müşteri almadı
- Numara WhatsApp'ta kayıtlı olmayabilir.
- 24 saat penceresi kapalı olabilir.
- Şablon onaylı değildir.
- Çözüm: `outbound_logs` ve `whatsapp_messages` kayıtlarını kontrol et; SMS/manual fallback kullan.

### Sadece WhatsApp Business uygulaması var
- API gönderimi çalışmaz.
- Çözüm: Cloud API/WABA kur veya `wa.me` manuel gönder.

---

## 9. Güvenlik

- Token, API anahtarı ve şifreler repoya yazılmaz.
- Tenant bilgileri `api_keys` tablosunda tenant bazlı tutulur.
- Token'lar belirli aralıklarla rotate edilir.
- Test ve canlı ortam anahtarları ayrıdır.
- Webhook verify token gizli tutulur.
- Personel erişimi en az yetki prensibiyle verilir.

---

## 10. Canlıya geçiş sırası

1. Esnafın Meta Business doğrulaması
2. WABA ve telefon numarası
3. System user token + phone number ID + WABA ID
4. Platform `api_keys` kaydı
5. Webhook
6. `payment_info` şablonu ve onay
7. Test mesajı ve IBAN siparişi
8. SMS sağlayıcı ve başlık onayı
9. SMS testi
10. Panel manuel gönderim testi
11. Canlı sipariş testi
12. İzleme: `outbound_logs`, `whatsapp_messages`, `activity_logs`

Bu adımlar tamamlandığında esnaf kendi WhatsApp ve SMS hesabıyla sistemi kullanmaya hazırdır.
