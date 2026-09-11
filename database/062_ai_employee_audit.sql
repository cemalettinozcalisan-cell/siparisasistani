-- ============================================================
-- SiparişAsistanı - 062: AI Çalışanım işlem denetim kaydı (audit)
-- Bilge'nin yaptığı her işlem: kim + ne + ne zaman + tenant + komut + onay + sonuç
-- ============================================================
create table if not exists ai_employee_audit (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     text,
  role        text,
  command     text not null,
  intent      text,
  params      jsonb,
  preview     text,
  code        text,
  confirmed   boolean not null default false,
  result      text,
  status      text not null default 'pending',   -- pending | confirmed | cancelled | failed
  created_at  timestamptz not null default now()
);

create index if not exists idx_ai_emp_audit_tenant on ai_employee_audit(tenant_id, created_at desc);

alter table ai_employee_audit enable row level security;