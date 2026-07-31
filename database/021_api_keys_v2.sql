-- API Keys v2 - Expanded providers & printer settings
alter table api_keys drop constraint if exists api_keys_provider_check;
alter table api_keys add constraint api_keys_provider_check
  check (provider in ('meta_whatsapp', 'meta_instagram', 'netgsm', 'deepseek', 'openai', 'elevenlabs', 'supabase', 'anthropic', 'bilge_ai', 'twilio', 'azure_speech', 'openai_tts'));

alter table tenant_settings add column if not exists whatsapp_enabled boolean not null default false;
alter table tenant_settings add column if not exists instagram_enabled boolean not null default false;
alter table tenant_settings add column if not exists phone_enabled boolean not null default false;
alter table tenant_settings add column if not exists website_enabled boolean not null default true;
alter table tenant_settings add column if not exists printer_type text not null default 'thermal';
alter table tenant_settings add column if not exists printer_copy_count integer not null default 1;
