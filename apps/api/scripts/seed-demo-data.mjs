#!/usr/bin/env node
/**
 * Demo test verisi (P7.4 realtime testleri için).
 * - Talep/şikâyet: complaints tablosuna 3 kayıt.
 * - Bu hafta + geçen hafta sipariş: raporların dolu dönmesi için.
 * - Görüşmeler (özetli): conversation_sessions.
 * Idempotent: TEST% / TEST-% / SEED-% kayıtları önce temizlenir, tekrar eklenir.
 * Çalıştır: node scripts/seed-demo-data.mjs
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const tid = '00000000-0000-0000-0000-000000000001';

const now = new Date();
const day = 86400000;
const iso = (d) => d.toISOString();
const daysAgo = (n) => new Date(now.getTime() - n * day);

const ordersSeed = [
  { order_number: 'TESTT1', status: 'shipped', total: 980, at: daysAgo(0.2) },
  { order_number: 'TESTW1', status: 'DELIVERED', total: 1250, at: daysAgo(1) },
  { order_number: 'TESTW2', status: 'DELIVERED', total: 860, at: daysAgo(2) },
  { order_number: 'TESTW3', status: 'shipped', total: 420, at: daysAgo(3) },
  { order_number: 'TESTL1', status: 'DELIVERED', total: 1500, at: daysAgo(8) },
  { order_number: 'TESTL2', status: 'DELIVERED', total: 980, at: daysAgo(10) },
  { order_number: 'TESTL3', status: 'DELIVERED', total: 640, at: daysAgo(11) },
];

const complaintsSeed = [
  { ticket: 'TEST-REQ-1', name: 'Ahmet Kurt', phone: '05551112233', category: 'request', severity: 'medium', description: 'Müşteri daha fazla sucuk stoğu olup olmadığını sordu ve yarın teslim istedi.' },
  { ticket: 'TEST-REQ-2', name: 'Ayşe Demir', phone: '05552223344', category: 'request', severity: 'low', description: 'Müşteri toplu sipariş için teklif istedi.' },
  { ticket: 'TEST-COMP-1', name: 'Elif Koç', phone: '05553334455', category: 'complaint', severity: 'high', description: 'Kargo geç teslim edildi, müşteri şikayetçi.' },
];

const convSeed = [
  { phone: '05551112233', label: 'SEED-1', at: daysAgo(0.5), data: { customer_name: 'Ahmet Kurt', summary: 'Sipariş teslim tarihi ve kargo durumu konuşuldu. Müşteri yarın teslim istedi.', products: ['Kangal Sucuk'], sentiment: 'HAPPY', needs_human: false } },
  { phone: '05552223344', label: 'SEED-2', at: daysAgo(2), data: { customer_name: 'Ayşe Demir', summary: 'Toplu sucuk siparişi için teklif istedi, fiyat listesi gönderildi.', products: ['Dana Parmak Sucuk'], sentiment: 'NEUTRAL', needs_human: false } },
  { phone: '05553334455', label: 'SEED-3', at: daysAgo(3), data: { customer_name: 'Elif Koç', summary: 'Geç teslimat nedeniyle şikayetini iletti, kargo takibi paylaşıldı.', products: [], sentiment: 'NEUTRAL', needs_human: false } },
];

(async () => {
  await sb.from('orders').delete().eq('tenant_id', tid).like('order_number', 'TEST%');
  await sb.from('complaints').delete().eq('tenant_id', tid).like('ticket_number', 'TEST-%');
  await sb.from('conversation_sessions').delete().eq('tenant_id', tid).like('session_label', 'SEED-%');

  for (const o of ordersSeed) {
    const { error } = await sb.from('orders').insert({
      tenant_id: tid,
      order_number: o.order_number,
      channel: 'phone',
      status: o.status,
      payment_method: 'iban',
      payment_status: o.status === 'shipped' ? 'waiting' : 'paid',
      total_price: o.total,
      cargo_company: 'Yurtiçi Kargo',
      source: 'WHOLESALE',
      notes: 'SEED-TEST',
      created_at: iso(o.at),
      updated_at: iso(o.at),
    });
    if (error) console.log('Sipariş hatası', o.order_number, error.message);
  }

  for (const c of complaintsSeed) {
    const { error } = await sb.from('complaints').insert({
      tenant_id: tid,
      ticket_number: c.ticket,
      channel: 'phone',
      source: 'seed-test',
      customer_name: c.name,
      customer_phone: c.phone,
      category: c.category,
      severity: c.severity,
      description: c.description,
      status: 'open',
      created_at: iso(daysAgo(1)),
    });
    if (error) console.log('Şikayet hatası', c.ticket, error.message);
  }

  for (const g of convSeed) {
    const { error } = await sb.from('conversation_sessions').insert({
      tenant_id: tid,
      channel: 'phone',
      phone: g.phone,
      status: 'completed',
      session_label: g.label,
      session_data: g.data,
      started_at: iso(g.at),
      ended_at: iso(g.at),
      created_at: iso(g.at),
    });
    if (error) console.log('Görüşme hatası', g.phone, error.message);
  }

  console.log('Seed tamam: 6 sipariş + 3 talep/şikâyet + 3 görüşme');
})();