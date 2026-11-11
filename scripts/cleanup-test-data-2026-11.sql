-- ============================================================
-- Test verisi temizligi (MANUEL)
-- UYARI: Once yedek alin ve asagidaki SELECT ile kapsami kontrol edin.
-- Ayni telefon gercek musteride kullaniliyorsa musteri kaydini silmeyin.
-- Bu script CALISTIRILMADAN once kapsam SELECT'lerini inceleyin.
-- ============================================================

begin;

-- Test siparis numaralari (gerekirse listeyi daraltin/genisletin)
create temp table test_orders as
select id, customer_id, order_number
from orders
where order_number between '26-00213' and '26-00229';

create temp table test_sessions as
select id, phone
from conversation_sessions
where order_id in (select id from test_orders);

create temp table test_customers as
select distinct customer_id as id
from test_orders
where customer_id is not null;

-- 0) Kapsam kontrolu
select 'orders' as tablo, count(*) from test_orders
union all
select 'order_items', count(*) from order_items where order_id in (select id from test_orders)
union all
select 'sessions', count(*) from test_sessions
union all
select 'customers', count(*) from test_customers;

-- 1) Silme (kapsam onaylandiysa)

delete from order_items where order_id in (select id from test_orders);
delete from payments where order_id in (select id from test_orders);
delete from print_jobs where order_id in (select id from test_orders);

delete from activity_logs
where entity_id in (select id::text from test_orders)
   or entity_id in (select id::text from test_sessions);

delete from ai_audit_logs where session_id in (select id from test_sessions);
delete from follow_up_reminders where session_id in (select id from test_sessions);
delete from outbound_logs where reference_id in (select id::text from test_orders);

-- Test telefonlarina ait WhatsApp mesajlari
delete from whatsapp_messages
where conversation_id in (
  select id from whatsapp_conversations
  where phone in ('905414266660', '5414266660', '905000000001')
);

-- Test telefonlarina ait cagri kayitlari
delete from call_recordings
where session_id in (
  select id from call_sessions
  where phone in ('905414266660', '5414266660', '905000000001')
);
delete from call_sessions
where phone in ('905414266660', '5414266660', '905000000001');

delete from conversation_sessions where id in (select id from test_sessions);
delete from orders where id in (select id from test_orders);

-- Sadece baska siparisi olmayan test musterilerini sil.
delete from customers c
where c.id in (select id from test_customers)
  and not exists (select 1 from orders o where o.customer_id = c.id);

drop table test_orders;
drop table test_sessions;
drop table test_customers;

commit;

-- Not: Test cagri kayitlari/Storage dosyalari varsa Storage'dan ayrica silinmeli.
-- Not: notifications ve webhook_events bu scriptte silinmez; retention ile temizlenir.
