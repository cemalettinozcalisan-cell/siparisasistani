-- Demo tenant ödeme yöntemlerini aktif et (simülatör testi için)
-- cargo_cod_enabled: Kapıda ödeme (Prompt'un okuduğu alan)
do $$
declare
  v_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  update tenant_settings set
    cargo_cod_enabled = true,
    cargo_cod_fee = 20
  where tenant_id = v_tenant_id;

  -- Eğer tenant_settings satırı yoksa INSERT (fallback)
  if not found then
    insert into tenant_settings (tenant_id, cargo_cod_enabled, cargo_cod_fee)
    values (v_tenant_id, true, 20)
    on conflict (tenant_id) do update set
      cargo_cod_enabled = true,
      cargo_cod_fee = 20;
  end if;
end $$;
