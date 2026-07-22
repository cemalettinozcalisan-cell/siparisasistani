# API Dokümantasyonu

Base URL: `/api`

## Siparişler
| Metot | Path | Açıklama |
|-------|------|----------|
| GET | /orders/:tenantId | Sipariş listesi |
| POST | /orders | Yeni sipariş (AI → Order Engine) |
| PATCH | /orders/:id/status | Durum güncelle |
| PATCH | /orders/:id/cancel | İptal |

## Müşteriler
| Metot | Path | Açıklama |
|-------|------|----------|
| GET | /customers/:tenantId | Liste (?q=ara) |
| GET | /customers/:tenantId/:id | Detay + sipariş geçmişi |
| POST | /customers/:tenantId | Yeni müşteri |
| PUT | /customers/:tenantId/:id | Güncelle |

## Ürünler
| Metot | Path | Açıklama |
|-------|------|----------|
| GET | /products/:tenantId | Liste |
| POST | /products/:tenantId | Ekle |
| POST | /products/:tenantId/bulk | Excel yükleme |
| PUT | /products/:tenantId/:id | Güncelle |
| DELETE | /products/:tenantId/:id | Sil |

## Dashboard
| Metot | Path | Açıklama |
|-------|------|----------|
| GET | /dashboard/:tenantId | İstatistikler |

## Ayarlar
| Metot | Path | Açıklama |
|-------|------|----------|
| GET | /settings/:tenantId | Tenant ayarları |
| PUT | /settings/:tenantId | Güncelle |

## AI Test
| Metot | Path | Açıklama |
|-------|------|----------|
| POST | /ai-test/simulate | Konuşma simüle et |
| POST | /ai-test/prompt-preview | Prompt önizleme |
| GET | /ai-test/audit/:tenantId | AI audit logları |

## Onboarding
| Metot | Path | Açıklama |
|-------|------|----------|
| POST | /onboarding | Yeni işletme kurulumu |
