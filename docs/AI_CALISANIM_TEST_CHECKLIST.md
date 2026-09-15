# AI Çalışanım — Manuel Browser Test Checklist (P7.3)

> P7.2 otomatik testleri geçti. Bu liste, **gerçek tarayıcıda** (mikrofon/ses) elle doğrulanacak
> kullanıcı akışlarını içerir. Her satır için ✅ / ❌ işaretle; ❌ olanı not al.

**Ortam:** Web `npm run dev` (3000) + API `npm run dev` (3001) çalışıyor. Demo İşletme ile giriş.
**Ön koşul:** 062/063/064/065 migration'ları uygulanmış; AI Çalışanım aktif.

---

## 1. Panel & Görünüm
- [ ] Ayarlar → AI Çalışanım sekmesi açılıyor
- [ ] 18 isim listesi (Bilge...Gökçe, Ayperi, Ece) görünüyor; isim seçince vurgulanıyor
- [ ] "2 Alkış + İsimle Uyandır" varsayılan AÇIK; "Bas-ve-Konuş" kapalı
- [ ] Sesli Bildirimler (Sipariş/Talep/Şikâyet/Abonelik/Stok) SaaS stili ikon+Toggle; aç/kapa çalışıyor
- [ ] "Test Et" butonu ses çalıyor ("Patron, merhaba. Ben [isim]...")
- [ ] Mikrofon göstergesi "🎙️ Mikrofon açık" alkış modundayken görünüyor

## 2. Uyandırma (2 Alkış + İsim)
- [ ] 2 kez el şaklat → "Uyanmak için isminizi söyleyin..." uyarısı çıkıyor
- [ ] "Bilge" deyince uyanıyor (kırmızı dinleme durumu)
- [ ] Yanlış isim / alakasız ses → uykuya dönüyor (yanlış tetikleme yok)
- [ ] Oturum açıkken **alkış+isim tekrarı gerekmeden** soru sorabiliyorum

## 3. Konuşma & Cevaplar
- [ ] "Bugün kaç sipariş aldık?" → sesli cevap
- [ ] "Günaydın" → günlük brifing
- [ ] "Son görüşmeleri özetle" → görüşme özetleri
- [ ] "En çok satan ürün" → rapor
- [ ] "Abonelik durumumuz" → paket + kalan hakkı + trend önerisi
- [ ] Cevap gecikmesi kabul edilebilir (his: < ~3 sn)

## 4. Komut + Onay
- [ ] "Yeni ürün ekle: X 500 TL" → "Onaylıyor musunuz?"
- [ ] "evet" → "Ürün eklendi" + ürün panelde görünüyor
- [ ] "hayır" → işlem iptal, ürün oluşmuyor
- [ ] Onaylanmadan işlem YAPILMIYOR (DB'de yok)
- [ ] "Müşteri ekle / özel fiyat / kargola / kampanya" aynı onay akışı
- [ ] Onay süresi dolunca "önceki onayınızın süresi doldu" mesajı (120 sn bekle)

## 5. Sesli Bildirim
- [ ] Gerçek sipariş/talep oluşunca (veya test satırı ekleyince) 15 sn içinde sesli bildirim
- [ ] Uykuda olsa bile bildirim sesli söyleniyor
- [ ] Bildirim bir kez söyleniyor (ack sonrası tekrar etmiyor)

## 6. Panel Kapatma & Yeniden Açma
- [ ] Sayfa kapatılırken AI aktifse uyarı gösteriliyor (native)
- [ ] Kapat → yeniden aç → sistem kaldığı yerden (bildirimler/sohbet) devam ediyor

## 7. Bas-ve-Konuş (opsiyonel — açarsan)
- [ ] Ayarlarda "Bas-ve-Konuş" açılınca buton çıkıyor
- [ ] Butona basıp konuşunca cevap geliyor
- [ ] Gürültülü ortamda alkış yerine buton daha rahat çalışıyor

---

## Sonuç
- ✅ sayısı: ____ / 25
- ❌ listesi (bug): 
  1.
  2.
- Yorumlar / his (doğallık, gecikme, uyandırma kolaylığı):