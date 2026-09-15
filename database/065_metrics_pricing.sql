-- ============================================================
-- SiparişAsistanı - 065: AI Çalışanım metrikler + fiyatlandırma config
-- ============================================================

-- 1) ai_employee_usage metrik kolonları
alter table ai_employee_usage add column if not exists latency_ms integer;
alter table ai_employee_usage add column if not exists input_tokens integer;
alter table ai_employee_usage add column if not exists output_tokens integer;
alter table ai_employee_usage add column if not exists provider text;

-- 2) Fiyatlandırma config tablosu (RLS aktif + service_role erişimi)
create table if not exists ai_pricing (
  provider text not null,
  model text not null,
  input_price_per_1k numeric not null,
  output_price_per_1k numeric not null,
  currency text not null default 'USD',
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  primary key (provider, model, effective_from)
);

alter table ai_pricing enable row level security;

create policy "service_role full access" on ai_pricing
  for all using (auth.role() = 'service_role');

-- Varsayılan fiyatlar (güncellenebilir)
insert into ai_pricing (provider, model, input_price_per_1k, output_price_per_1k) values
('deepseek', 'deepseek-chat', 0.00027, 0.00110),
('deepseek', 'deepseek-reasoner', 0.00055, 0.00219),
('openai', 'gpt-4o-mini', 0.00015, 0.00060),
('openai', 'gpt-4o', 0.00250, 0.01000),
('elevenlabs', 'tts', 0.0, 0.0)
on conflict (provider, model, effective_from) do nothing;