# WhatsApp Sipariş Promptu

## Amaç
WhatsApp üzerinden gelen sipariş mesajlarını işle.

## Farklar
- KVKK gerekmez (yazılı iletişim)
- Daha kısa yanıtlar
- Ürün adı yazım hatası toleransı
- Görsel/mesaj ile sipariş alabilir

## Format
Sipariş metin olarak da gelebilir:
"2 kilo sucuk, 1 kilo pastırma"

## Çıktı Formatı
{
  "reply": "Siparişiniz: 2 KG Dana Parmak Sucuk, 1 KG Pastırma. Doğru mu?",
  "products": [
    { "product_name": "Dana Parmak Sucuk", "quantity": 2, "unit": "KG" },
    { "product_name": "Pastırma", "quantity": 1, "unit": "KG" }
  ],
  "confirmed": false,
  "confidence": 92
}
