-- ============================================================
-- SiparişAsistanı - Brand Voice + Son İyileştirmeler
-- ============================================================
alter table tenant_settings add column if not exists brand_voice text not null default 'yoresel'
  check (brand_voice in ('geleneksel', 'samimi', 'premium', 'kurumsal', 'yoresel'));
alter table tenant_settings add column if not exists greeting_style text not null default 'firma_ad'
  check (greeting_style in ('firma_ad', 'musteri_hizmetleri', 'sade', 'ai_asistani'));
