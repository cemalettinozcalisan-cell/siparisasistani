# Konuşma Kuralları

## Akış
```
Telefon Geldi → KVKK → Karşılama → Sipariş → Ürün Doğrulama
→ Özet → Müşteri Onayı → Adres → Ödeme → Sipariş Oluştur
```

## Temel Kurallar
1. Önce sipariş, sonra adres
2. Her ürünü tek tek teyit et
3. Çift onay: "Son kez onaylıyor musunuz?"
4. AI önce kendi çözer, başaramazsa insana devreder
5. Şiveyi anla, Afyon terimlerini tanı
6. Asla uydurma ürün ekleme
7. Anlayamazsan tekrar sor, WhatsApp öner, geri arama öner

## Session State Machine
- welcome → ordering → product_verification → summary
- → customer_confirmation → address → payment → order_created
- → completed | cancelled | human_transfer

## Confidence Score
| Skor | Etiket | Panelde Gösterim |
|------|--------|------------------|
| 90+ | Çok Güvenli | 🟢 İnsan Kontrolü Gerekli Değil |
| 70-89 | Güvenli | 🟡 İnsan Kontrolü Öneriliyor |
| 50-69 | Düşük Güven | 🟠 İnsan Kontrolü Gerekli |
| <50 | Çok Düşük | 🔴 Ses Kaydı Dinlenmeli |
