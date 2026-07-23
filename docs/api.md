# API Referansı

Base URL: `/api`

## Kimlik Doğrulama
| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| POST | /api/auth/login | Giriş yap |
| GET | /api/auth/me | Oturum bilgisi |
| POST | /api/auth/logout | Çıkış yap |

## Siparişler
| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| POST | /api/orders/create-from-ai | AI'dan sipariş oluştur |
| POST | /api/orders/status | Sipariş durumu güncelle |
| GET | /api/orders-list/:tenantId | Sipariş listesi |

## Müşteriler
| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| GET | /api/customers/:tenantId | Müşteri listesi |
| POST | /api/customers/:tenantId | Müşteri ekle |

## Şikayetler
| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| POST | /api/complaints/create-from-ai | AI'dan şikayet oluştur |

## SaaS Yönetimi
| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| GET | /api/saas/plans | Abonelik planları |
| GET | /api/saas/subscription/:tenantId | Abonelik detayı |
| POST | /api/saas/upgrade/:tenantId | Plan yükselt |

## Sağlık
| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| GET | /api/health | Sistem sağlığı |
| GET | /api/health/:tenantId | Tenant sağlık metrikleri |
