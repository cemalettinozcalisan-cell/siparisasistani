-- Business Settings v2 — Day-based hours, payments, delivery, cargo rules
alter table tenant_settings add column if not exists after_hours_behavior text not null default 'hold_order';
alter table tenant_settings add column if not exists business_hours_data jsonb default '{"monday":{"open":true,"start":"08:00","end":"18:30"},"tuesday":{"open":true,"start":"08:00","end":"18:30"},"wednesday":{"open":true,"start":"08:00","end":"18:30"},"thursday":{"open":true,"start":"08:00","end":"18:30"},"friday":{"open":true,"start":"08:00","end":"18:30"},"saturday":{"open":false,"start":"08:00","end":"14:00"},"sunday":{"open":false,"start":"08:00","end":"14:00"}}';

alter table tenant_settings add column if not exists whatsapp_group_id text;
alter table tenant_settings add column if not exists printer_beep_enabled boolean not null default true;
alter table tenant_settings add column if not exists web_notifications_enabled boolean not null default true;

alter table tenant_settings add column if not exists cash_on_delivery_enabled boolean not null default true;
alter table tenant_settings add column if not exists card_on_delivery_enabled boolean not null default false;
alter table tenant_settings add column if not exists bank_name text;
alter table tenant_settings add column if not exists recipient_name text;
alter table tenant_settings add column if not exists iban_number text;
alter table tenant_settings add column if not exists min_order_amount numeric(10,2) default 0;

alter table tenant_settings add column if not exists excluded_regions jsonb default '[]';
alter table tenant_settings add column if not exists international_shipping_enabled boolean not null default false;
alter table tenant_settings add column if not exists shipping_countries jsonb default '[]';

alter table tenant_settings add column if not exists city_delivery_time text;
alter table tenant_settings add column if not exists intercity_cargo_time text;
alter table tenant_settings add column if not exists delivery_rules jsonb default '[]';
