-- ============================================================
-- SiparişAsistanı - Full Enum Definitions (Fresh Supabase Install)
-- Run this FIRST, before all_migrations.sql
-- ============================================================

-- Drop existing enum types (if re-running)
do $$ begin
  drop type if exists user_role cascade;
  drop type if exists order_channel cascade;
  drop type if exists order_status cascade;
  drop type if exists payment_method cascade;
  drop type if exists payment_status cascade;
  drop type if exists call_direction cascade;
  drop type if exists ai_result cascade;
  drop type if exists message_direction cascade;
  drop type if exists notification_type cascade;
  drop type if exists notification_status cascade;
  drop type if exists ai_event_type cascade;
exception when others then null;
end $$;

-- All enums with complete value sets
create type user_role as enum ('owner', 'manager', 'staff');
create type order_channel as enum ('phone', 'whatsapp', 'manual');
create type order_status as enum ('new', 'PAYMENT_WAITING', 'PAYMENT_CONFIRMED', 'PACKAGING', 'PACKAGED', 'approved', 'preparing', 'shipped', 'DELIVERED', 'completed', 'cancelled');
create type payment_method as enum ('iban', 'website', 'paytr', 'iyzico');
create type payment_status as enum ('waiting', 'paid', 'failed');
create type call_direction as enum ('incoming', 'outgoing');
create type ai_result as enum ('completed', 'needs_review', 'callback', 'failed');
create type message_direction as enum ('incoming', 'outgoing');
create type notification_type as enum ('new_order', 'human_request', 'callback', 'cargo', 'payment', 'warning');
create type notification_status as enum ('unread', 'read');
create type ai_event_type as enum (
  'order_received',
  'payment_requested',
  'whatsapp_redirect',
  'callback_scheduled',
  'human_transfer',
  'printer_sent',
  'whatsapp_group_sent',
  'order_failed',
  'customer_unknown'
);
