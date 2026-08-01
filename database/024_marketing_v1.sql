-- Marketing v1 — birthday column + notification type
alter table customers add column if not exists birth_date date;

-- birthday discount settings for tenant_settings
alter table tenant_settings add column if not exists birthday_discount_type text not null default 'percent';
alter table tenant_settings add column if not exists birthday_discount_value numeric(5,2) default 10;
alter table tenant_settings add column if not exists birthday_message_template text;
