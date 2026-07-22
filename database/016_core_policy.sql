-- ============================================================
-- SiparişAsistanı - Core Policy + Kargo Ayarları
-- ============================================================
alter table tenant_settings add column if not exists yurtici_enabled boolean not null default false;
alter table tenant_settings add column if not exists yurtici_price numeric(8,2) default 0;
alter table tenant_settings add column if not exists mng_enabled boolean not null default false;
alter table tenant_settings add column if not exists mng_price numeric(8,2) default 0;
alter table tenant_settings add column if not exists aras_enabled boolean not null default false;
alter table tenant_settings add column if not exists aras_price numeric(8,2) default 0;
alter table tenant_settings add column if not exists free_shipping_min numeric(8,2) default 0;
