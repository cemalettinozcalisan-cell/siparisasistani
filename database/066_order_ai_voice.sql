-- 066: Sipariş AI — seçilen Gemini Live sesi (tenant bazlı)
-- Supabase SQL Editor'da çalıştırın. Idempotent.
alter table tenant_settings
  add column if not exists order_ai_voice text;

-- Mevcut kayıtlara varsayılan (Aoede) ata (yalnızca boşsa)
update tenant_settings
  set order_ai_voice = 'Aoede'
  where order_ai_voice is null;
