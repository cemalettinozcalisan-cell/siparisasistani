# DATABASE_SCHEMA.md

## Mimari: Multi-Tenant SaaS

```
TENANT (Firma)
  ├── Users
  ├── Products
  ├── Customers
  ├── Orders
  │     └── Order Items
  ├── Calls
  ├── WhatsApp Messages
  ├── Settings
  ├── Notifications
  └── AI Events (sistem içi)
```

## Tablolar

### tenants
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid PK | Otomatik oluşturulur |
| company_name | text | Firma adı |
| domain | text unique | Alt domain |
| phone | text | Telefon |
| email | text | E-posta |
| iban | text | Banka hesabı |
| address | text | Adres |
| city | text | Şehir |
| tax_number | text | Vergi numarası |
| logo_url | text | Logo |
| status | text | active/default |
| created_at | timestamptz | Oluşturulma |
| updated_at | timestamptz | Güncellenme |

### users
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid PK | |
| tenant_id | uuid FK | tenants.id |
| name | text | Ad Soyad |
| email | text | E-posta |
| phone | text | Telefon |
| password | text | Hash'li şifre |
| role | enum | owner, employee |
| active | boolean | true/false |
| created_at | timestamptz | |

### products
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid PK | |
| tenant_id | uuid FK | tenants.id |
| product_name | text | Ürün adı |
| category | text | Kategori |
| price | numeric(12,2) | Birim fiyat |
| unit | text | KG / ADET |
| active | boolean | true/false |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### customers
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid PK | |
| tenant_id | uuid FK | tenants.id |
| name | text | Ad Soyad |
| phone | text | Telefon |
| email | text | E-posta |
| address | text | Adres |
| city | text | Şehir |
| note | text | Not |
| identity_number | text | TC Kimlik (opsiyonel, e-fatura için) |
| created_at | timestamptz | |

### orders
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid PK | |
| tenant_id | uuid FK | tenants.id |
| customer_id | uuid FK | customers.id |
| order_number | text | YY-00001 formatında |
| channel | enum | phone, whatsapp, manual |
| status | enum | new, approved, preparing, shipped, completed, cancelled |
| payment_method | enum | iban, website, paytr, iyzico |
| payment_status | enum | waiting, paid, failed |
| total_price | numeric(12,2) | Toplam tutar |
| cargo_company | text | Kargo firması |
| tracking_number | text | Takip no |
| notes | text | Notlar |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### order_items
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid PK | |
| order_id | uuid FK | orders.id |
| product_id | uuid FK | products.id |
| product_name | text | Ürün adı (anlık kopya) |
| quantity | numeric(12,3) | Miktar |
| unit | text | KG / ADET |
| unit_price | numeric(12,2) | Birim fiyat |
| total | numeric(12,2) | Ara toplam |
| created_at | timestamptz | |

### calls
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid PK | |
| tenant_id | uuid FK | tenants.id |
| customer_id | uuid FK | customers.id |
| phone | text | Telefon |
| call_direction | enum | incoming, outgoing |
| duration | integer | Saniye |
| record_url | text | Kayıt linki |
| transcript | text | Transkript |
| ai_result | enum | completed, needs_review, callback, failed |
| created_at | timestamptz | |

### whatsapp_messages
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid PK | |
| tenant_id | uuid FK | tenants.id |
| customer_id | uuid FK | customers.id |
| direction | enum | incoming, outgoing |
| message | text | Mesaj içeriği |
| media_url | text | Medya linki |
| created_at | timestamptz | |

### settings
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid PK | |
| tenant_id | uuid FK (unique) | tenants.id |
| voice_gender | text | female (default) |
| printer_enabled | boolean | Yazıcı entegrasyonu |
| whatsapp_group_enabled | boolean | WhatsApp grubu |
| payment_paytr | boolean | PayTR ödeme |
| payment_iyzico | boolean | Iyzico ödeme |
| payment_website | boolean | Web sitesi ödeme |
| website_url | text | Web site URL |
| callback_enabled | boolean | Geri arama |
| human_transfer_enabled | boolean | Yetkiliye yönlendirme |
| voice_recording_enabled | boolean | Ses kaydı |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### notifications
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid PK | |
| tenant_id | uuid FK | tenants.id |
| type | enum | new_order, human_request, callback, cargo, payment, warning |
| title | text | Başlık |
| message | text | Mesaj |
| status | enum | unread, read |
| created_at | timestamptz | |

### ai_events (sistem içi - müşteriye görünmez)
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | uuid PK | |
| tenant_id | uuid FK | tenants.id |
| order_id | uuid FK | orders.id |
| event_type | enum | order_received, payment_requested, whatsapp_redirect, callback_scheduled, human_transfer, printer_sent, whatsapp_group_sent, order_failed, customer_unknown |
| event_data | jsonb | Olay detayları |
| created_at | timestamptz | |

## RLS (Row Level Security)
Tüm tablolar `tenant_id` üzerinden izole edilmiştir. Her kullanıcı yalnızca kendi tenant'ının verilerini görür.

## SQL Migration
Migration dosyası: `database/001_schema.sql`
