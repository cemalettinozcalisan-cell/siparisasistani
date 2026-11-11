-- ============================================================
-- 082 - Sucuk cesit aliases (Kangal Sucuk)
-- Musteri "sap sucuk / acisiz sucuk / normal sucuk / kangal sucuk"
-- derse ayni kanonik urune baglanir. Sadece "sucuk" denirse AI cesit sorar.
-- ============================================================

insert into product_aliases (tenant_id, product_id, alias)
select p.tenant_id, p.id, a.alias
from products p
cross join (
  values
    ('sap sucuk'),
    ('acisiz sucuk'),
    ('acısız sucuk'),
    ('normal sucuk'),
    ('kangal sucuk')
) as a(alias)
where p.active
  and p.product_name ilike 'Kangal Sucuk'
  and p.tenant_id in (
    '00000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001'
  )
on conflict (tenant_id, alias) do nothing;
