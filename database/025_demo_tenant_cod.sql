-- Demo tenant'ta kapıda ödemeyi garantile
update tenant_settings set cash_on_delivery_enabled = true
where tenant_id = '00000000-0000-0000-0000-000000000001';
