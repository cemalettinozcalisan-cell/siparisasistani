# PROMPT_ENGINE.md

## Amaç
Yapay zeka asistanının sipariş süreçlerinde doğru ve bağlamsal yanıtlar vermesini sağlamak.

## Prompt Kategorileri
1. **Sipariş Alma** - Yeni sipariş oluşturma
2. **Müşteri Desteği** - Müşteri sorularını yanıtlama
3. **Envanter Sorgulama** - Stok durumu sorgulama
4. **Raporlama** - Veri analizi ve rapor oluşturma

## Prompt Şablon Yapısı
```json
{
  "system_prompt": "...",
  "user_prompt": "...",
  "variables": [],
  "output_format": "..."
}
```
