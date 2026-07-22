# API_LIST.md

## Sipariş API'leri
| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| GET | /api/orders | Siparişleri listele |
| POST | /api/orders | Yeni sipariş oluştur |
| GET | /api/orders/:id | Sipariş detayı |
| PUT | /api/orders/:id | Sipariş güncelle |
| DELETE | /api/orders/:id | Sipariş sil |

## Müşteri API'leri
| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| GET | /api/customers | Müşterileri listele |
| POST | /api/customers | Yeni müşteri ekle |
| GET | /api/customers/:id | Müşteri detayı |
| PUT | /api/customers/:id | Müşteri güncelle |

## Ürün API'leri
| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| GET | /api/products | Ürünleri listele |
| POST | /api/products | Yeni ürün ekle |
| PUT | /api/products/:id | Ürün güncelle |

## AI API'leri
| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| POST | /api/ai/ask | Asistana soru sor |
| POST | /api/ai/order | Doğal dil ile sipariş oluştur |
