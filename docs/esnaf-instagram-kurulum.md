# Esnaf Instagram DM Kurulum Rehberi

Bu doküman, her esnafın **kendi Meta app'i**, **kendi Instagram professional hesabı**, kendi token'ı ve kendi webhook'u ile Instagram DM kanalını canlıya alması için hazırlanmıştır.

Temel kural: Her tenant tamamen ayrıdır. Bir esnafın Instagram hesabı, token'ı, webhook'u, konuşması veya müşteri verisi başka tenant'ta görünmez ve kullanılmaz.

## 1. Seçilen model
**Instagram API with Instagram Login** kullanılır.

- API host: `graph.instagram.com`
- Token: Instagram User access token
- Mesaj endpoint'i: `/<IG_ID>/messages` veya `/me/messages`
- Facebook Page zorunluluğu yoktur.
- Her esnaf kendi Meta app'ini ve kendi Instagram professional hesabını bağlar.

## 2. Ön koşullar
- Instagram **professional** hesap (Business/Creator)
- Her esnaf için ayrı Meta app
- HTTPS'e açık API domaini
- Webhook verify token (her tenant için ayrı)
- Meta App Secret (her tenant için ayrı)
- Instagram User access token
- Instagram professional account ID (IG ID)

## 3. Meta app kurulumu (her esnaf)
1. `developers.facebook.com` üzerinden esnaf adına Meta app oluştur.
2. App Dashboard > Use cases > **Manage messaging & content on Instagram**.
3. **Instagram > API setup with Instagram login** bölümünü aç.
4. Esnafın Instagram professional hesabını **Instagram Tester** olarak ekle.
5. Esnaf Instagram'da daveti kabul etsin:
   - Settings > Website permissions > Apps and websites > Tester Invites.
6. **Generate token** ile Instagram User access token üret.
7. App Secret'i App Dashboard > Settings > Basic'ten al.
8. Webhook için bir **Verify Token** belirle (tahmin edilmesi zor, tenant'a özel).

Not: İlk testte tek Instagram hesabı kullanılabilir. Canlıda her esnaf kendi hesabını kendi app'ine bağlar.

## 4. Platforma bilgileri girme
Panel > API Anahtarları > **Instagram DM**:

| Alan | Değer |
|---|---|
| Instagram Access Token | Instagram User access token |
| Instagram ID | IG professional account ID |
| Meta App Secret | App Secret |
| Webhook Verify Token | Tenant'a özel verify token |

`api_keys.meta_instagram` kaydı bu bilgileri tenant bazında tutar. Başka tenant ile paylaşılmaz.

## 5. Webhook
Her tenant'ın callback URL'si ayrıdır:

```text
https://<api-domain>/api/instagram/webhook/<tenantId>
```

Meta App Dashboard > Instagram > Configure webhooks:
- Callback URL: yukarıdaki tenant URL'si
- Verify Token: panelde girilen verify token
- Webhook alanları: `messages`, `messaging_postbacks`, gerekirse `message_reactions`

API tarafı:
- GET: `hub.mode`, `hub.verify_token`, `hub.challenge` doğrulanır; challenge düz metin döner.
- POST: `X-Hub-Signature-256`, tenant'ın App Secret'ı ile doğrulanır.
- Payload'daki Instagram account ID, tenant'ın IG ID'siyle eşleşmezse event işlenmez.
- Mesajlar yalnızca o tenant'ın `instagram_conversations` / `instagram_messages` / `conversation_sessions` kayıtlarına yazılır.

## 6. Webhook testi
### Meta'nın kendi testi
1. Meta App Dashboard > Webhooks > Instagram > **Test**.
2. Test event gönder.
3. API logunda tenant'a ait event görünmeli.
4. Başka tenant'ta kayıt oluşmamalı.

### Platformun dev-only test endpoint'i
Üretimde kapalıdır. `.env`:

```env
INSTAGRAM_TEST_SECRET=uzun-rastgele-bir-secret
```

İstek:

```http
POST /api/instagram/test/webhook/<tenantId>
x-instagram-test-secret: <INSTAGRAM_TEST_SECRET>
Content-Type: application/json
```

Body, Meta webhook payload'ı ile aynı formatta olmalıdır. Bu endpoint yalnızca geliştirme/test içindir; Meta'nın gerçek testinin yerini almaz.

## 7. Test gönderimi
### Meta Graph API ile
- Instagram User access token ile:
  - `POST https://graph.instagram.com/v23.0/<IG_ID>/messages`
  - Body:
```json
{
  "recipient": { "id": "<IGSID>" },
  "message": { "text": "Test mesajı" }
}
```
- `<IGSID>` webhook'tan gelen müşteri Instagram-scoped ID'sidir.
- Konuşmayı müşteri başlatmalıdır; standart mesajlaşma penceresi geçerlidir.

### Platform test endpoint'i
```http
POST /api/instagram/send/<tenantId>/<conversationId>
Content-Type: application/json

{ "text": "Test mesajı", "to": "<IGSID>" }
```

`to` verilmezse servis `instagram_conversations.instagram_user_id` alanından bulur. Sonuç gerçek Meta gönderim sonucudur: `sent` / `failed`, provider message ID veya hata.

## 8. Tenant izolasyonu kontrol listesi
- [ ] Her tenant'ın ayrı Meta app'i var
- [ ] Her tenant'ın ayrı Instagram professional hesabı var
- [ ] Her tenant'ın ayrı access token'ı var
- [ ] Her tenant'ın ayrı App Secret'ı var
- [ ] Her tenant'ın ayrı verify token'ı var
- [ ] Webhook URL tenant'a özel
- [ ] GET challenge tenant verify token'ı ile geçiyor
- [ ] POST signature tenant app secret'ı ile geçiyor
- [ ] Payload IG account ID tenant IG ID'si ile eşleşiyor
- [ ] Test mesajı sadece o tenant'ın konuşmasına yazılıyor
- [ ] Başka tenant'ın verisi panelde görünmüyor

## 9. Canlıya geçiş
- Her esnaf kendi Meta app'ini ve IG hesabını bağlar.
- Uygulama geliştirme modundan çıkacaksa Meta **Advanced Access** / app review gerekebilir.
- Standart mesajlaşma penceresi ve gerekli izinler kontrol edilir.
- Token süresi/rotasyonu takip edilir.
- Webhook imza doğrulaması açık kalır.
- `INSTAGRAM_TEST_SECRET` üretimde boş bırakılır; fake endpoint 404 döner.

## 10. Sık hatalar
- **Webhook verification failed:** verify token yanlış veya GET challenge dönmüyor.
- **Invalid signature:** App Secret yanlış veya raw body bozulmuş.
- **Tenant mismatch:** payload'daki IG account ID, paneldeki IG ID ile eşleşmiyor.
- **Recipient missing:** webhook'tan gelen IGSID bulunamadı.
- **Token/permission:** Instagram User token geçersiz veya mesaj izni yok.
- **Pencere kapalı:** müşteri konuşmayı başlatmamış; standart pencere dışında gönderim reddedilir.
