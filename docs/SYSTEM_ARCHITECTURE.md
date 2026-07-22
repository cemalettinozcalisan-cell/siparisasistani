# SYSTEM_ARCHITECTURE.md

## Genel Mimarı

```
[Frontend] <--> [API Gateway] <--> [Backend Services]
                                         |
                                    [Database]
                                         |
                                    [AI Engine]
```

## Katmanlar
1. **Presentation Layer** - Kullanıcı arayüzü
2. **API Layer** - RESTful API servisleri
3. **Business Logic Layer** - İş mantığı
4. **Data Layer** - Veritabanı ve depolama
5. **AI Layer** - Prompt yönetimi ve AI asistan
