-- Demo user for tenant 00000000-0000-0000-0000-000000000001
-- Password: demo123 (SHA256 hash)
insert into users (tenant_id, name, email, phone, password, role, active)
select '00000000-0000-0000-0000-000000000001', 'Demo Owner', 'demo@siparisasistani.com', '05320000000',
  'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'owner', true
where not exists (select 1 from users where email = 'demo@siparisasistani.com');
