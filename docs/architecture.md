# Sistem Mimarisi

## Genel Bakış
SiparişAsistanı, çok kiracılı (multi-tenant) SaaS bir sipariş yönetim sistemidir.
AI (OpenAI/DeepSeek) ile telefon ve WhatsApp üzerinden sipariş alır, Order Engine ile işler, Event Bus ile tüm kanallara dağıtır.

## Mimarı Akış
```
Telefon (NetGSM) / WhatsApp (Evolution API)
        │
        ▼
AI Conversation Engine (dinamik prompt)
        │
        ▼
Order Engine (AI asla DB'ye direkt yazmaz)
        │
        ▼
Event Bus (RxJS)
  ├── Notification Service
  │     ├── Activity Log
  │     ├── WhatsApp Group
  │     ├── Print Queue
  │     └── (ileride: SMS, Email, Push)
  ├── Shipments
  ├── Payments
  └── Call Sessions
```

## Teknoloji Yığını
| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js + TailwindCSS + Zustand |
| Backend | NestJS + TypeScript |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| AI | OpenAI / DeepSeek (Provider Pattern) |
| Telefon | NetGSM Webhook |
| WhatsApp | Evolution API |

## Modüller
- **Prompt Engine**: Dinamik prompt assembly (firma + ürün + kurallar + müşteri hafızası)
- **Conversation Service**: State machine (welcome → ordering → confirm → address → payment)
- **Order Engine**: Müşteri çözümle, sipariş oluştur, event fırlat
- **Event Bus**: RxJS subject, 10 event tipi, listener'lar
- **AI Audit**: Her prompt/response loglanır
- **Activity Log**: Timeline bazlı tüm hareket kaydı
