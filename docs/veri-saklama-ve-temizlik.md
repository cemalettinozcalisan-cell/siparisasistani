# Veri Saklama ve Temizlik Planı

Bu doküman, Supabase **egress** ve **database/storage** kullanımını uzun vadede düşürmek için önerilen saklama sürelerini ve temizlik sırasını içerir.

Önemli: Buradaki silmeler **mevcut egress kilidini açmaz**. Egress bu dönemde tüketilmiştir. Temizlik, **20 Kasım reset sonrası** gelecek dönemin egress/DB/Storage kullanımını azaltır.

## 1. Önerilen saklama süreleri

### Teknik kayıtlar (otomatik temizlik uygun)
| Tablo | Süre | Not |
|---|---|---|
| `ai_audit_logs` | 90 gün | AI replay/audit; son 90 gün panelde kalır |
| `conversation_sessions` (completed/failed) | 180 gün | `active` oturumlar ASLA silinmez |
| `whatsapp_messages` | 180 gün | Sohbet geçmişi/panel |
| `outbound_logs` | 90 gün | Gönderim izleme |
| `activity_logs` | 180 gün | Panel aktivite; çağrı listesi son 100 kaydı kullanır |
| `notifications` | 90 gün | Panel bildirim geçmişi |
| `ai_voice_notifications` | 30 gün | Sesli bildirim kuyruğu |
| `channel_health` | 30 gün | Kanal sağlığı geçmişi |
| `print_jobs` | 90 gün | Yazdırma işleri |
| `webhook_events` | 30 gün | Webhook dedup; son 30 gün korunmalı |
| `follow_up_reminders` | 180 gün | Hatırlatma durumu |
| `call_sessions` / `call_recordings` | 180 gün | Kayıt oynatma/denetim; Storage objeleri ayrıca silinir |

### İş kayıtları (otomatik silme YOK)
| Tablo | Not |
|---|---|
| `orders`, `order_items`, `payments` | Muhasebe/ticari kayıt; otomatik silinmez |
| `customers` | Müşteri geçmişi; otomatik silinmez |
| `products`, `tenant_settings`, `tenants`, `api_keys` | Yapılandırma; silinmez |
| `campaign_logs`, IYS/izin kayıtları | Mevzuat/izin; saklanır |

## 2. Temizlik sırası ve kurallar

1. **Yedek al** (Supabase backup / pg_dump).
2. **Active/recent kayıtları koru**:
   - `conversation_sessions.status = 'active'` silinmez.
   - Son 24 saatteki `ai_audit_logs`/mesajlar silinmez.
   - Aktif siparişlerin oturumları silinmez.
3. **FK sırası**:
   - Test verisi silinecekse önce `order_items`, `payments`, `notifications`, `print_jobs`, `follow_up_reminders`, `activity_logs`, `ai_audit_logs`, `conversation_sessions`, `whatsapp_messages`, `outbound_logs`, `webhook_events`, `call_recordings`, `call_sessions`, sonra `orders`, en son `customers`.
4. **Storage**:
   - `call_recordings` satırları silinse bile Storage'daki ses dosyaları ayrıca silinmeli.
   - Storage silmeden sadece DB silmek egress/alan kazancı sağlamaz.
5. **Batch**:
   - Tek seferde milyonlarca satır silme; 5.000-10.000’lik batch’ler kullan.
6. **Doğrulama**:
   - Silme sonrası panel, çağrılar, AI audit ve hatırlatmalar test edilmeli.

## 3. Test verisi temizliği

Test siparişleri (`26-002xx`) ve test müşterileri, gerçek iş verisinden ayrılarak silinebilir. Ancak:

- Aynı telefon numarası gerçek müşteride de kullanılıyorsa müşteri kaydı silinmemeli.
- `customers` silmeden önce o müşteriye bağlı gerçek sipariş var mı kontrol edilmeli.
- Silme öncesi yedek ve `SELECT` ile doğrulama yapılmalı.
- Hazırlanan script: `scripts/cleanup-test-data-2026-11.sql` (çalıştırmadan önce incele).

## 4. Otomatik retention

Öneri:
- Günlük 03:00’te batch temizlik.
- Önce `SELECT count(*)` ile etkilenecek satır sayısını gör.
- 90/180 gün eşikleri yapılandırılabilir olsun.
- `active`, `unread`, son 24 saat ve iş kayıtları hariç tutulsun.
- Silme sonuçları `activity_logs`’a yazılsın (kaç satır silindi).

## 5. Riskler

| İşlem | Etki | Risk |
|---|---|---|
| `ai_audit_logs` eski kayıtları sil | Egress/DB düşer | Eski AI replay/audit kaybolur; aktif/hatırlatma kayıtları korunmalı |
| `conversation_sessions` eski completed/failed sil | Egress/DB düşer | Eski çağrı geçmişi kaybolur; active silinirse hatırlatma/AI bozulur |
| `whatsapp_messages` sil | DB/egress düşer | Eski sohbet panelden kaybolur |
| `webhook_events` son 30 günü sil | DB düşer | **Dedup bozulur; mükerrer sipariş riski** |
| `orders`/`customers` sil | DB düşer | Gerçek iş verisi/rapor/FK bozulur; yapılmamalı |
| `call_recordings` DB sil, Storage bırak | Alan kazanılmaz | Egress/Storage devam eder |
| Storage ses dosyalarını sil | Storage/egress düşer | Kayıt oynatma/denetim kaybolur |
| Log seviyesini tamamen kapat | Log ingestion düşer | Hata ayıklama/güvenlik izleme kaybolur |

## 6. Uygulama sırası

1. 20 Kasım reset bekle.
2. Yedek al.
3. `SELECT` ile etkilenecek satırları doğrula.
4. Test verisi temizliğini ayrı uygula.
5. Retention batch’lerini çalıştır.
6. Storage eski kayıtlarını sil.
7. 1 hafta egress/DB/Storage ve paneli izle.
8. Gerekirse Pro plan kararı ver.
