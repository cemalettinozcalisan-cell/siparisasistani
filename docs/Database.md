# Veritabanı Şeması

## Teknoloji
- Supabase (PostgreSQL)
- Row Level Security (RLS) ile multi-tenant izolasyon

## Ana Tablolar

| Tablo | Açıklama |
|-------|----------|
| tenants | Firma kayıtları (multi-tenant) |
| users | Kullanıcılar (owner/manager/staff) |
| products | Ürün kataloğu |
| customers | Müşteriler |
| orders | Siparişler |
| order_items | Sipariş kalemleri |
| payments | Ödeme kayıtları |
| shipments | Kargo bilgileri |
| campaigns | Kampanyalar |
| notifications | Bildirimler |
| activity_logs | Timeline kayıtları |
| ai_audit_logs | AI denetim kayıtları |
| subscription_plans | Abonelik planları |
| subscriptions | Tenant abonelikleri |
| invoices | Faturalar |

## Migration Sırası
1. `001_schema.sql` - Temel tablolar
2. `003_event_bus_migration.sql` - Event Bus
3. `004_enhancements.sql` - İyileştirmeler
4. ... (diğer migration'lar sırayla)
