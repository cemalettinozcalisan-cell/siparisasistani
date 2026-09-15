#!/usr/bin/env node
/**
 * AI Çalışanım — Demo Tenant Simülasyonu (P7.5)
 * 3 işletme profili (sucuk/yoğun, lokum/perakende, yumurta/B2B) üzerinde:
 * bilgi + komut+onay senaryoları, latency ölçümü, maliyet toplama.
 *
 * Çalıştırma: node scripts/ai-employee-sim.mjs <BASE_URL>
 * Geçici test kullanıcıları oluşturur (sadece bu çalıştırmada), sonunda temizler.
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const BASE = process.argv[2] || 'http://localhost:3101';
const SB = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const TEST_PW = 'test123456';
const TEST_HASH = crypto.createHash('sha256').update(TEST_PW).digest('hex');

const PROFILES = [
  { domain: 'danet', label: 'SUCUK / YOĞUN PERAKENDE', scenarios: ['Bugün kaç sipariş aldık?', 'En çok satan ürün nedir?', 'Günaydın', 'Son görüşmeleri özetle', 'Abonelik durumumuz nedir?'] },
  { domain: 'taylan', label: 'LOKUM / PERAKENDE', scenarios: ['Bugünkü raporu ver', 'Son görüşmeleri özetle', 'Günaydın', 'En çok satan ürün nedir?', 'Abonelik durumumuz nedir?'] },
  { domain: 'evrenkaya', label: 'YUMURTA / B2B', scenarios: ['Bugün kaç sipariş aldık?', 'Bugünkü raporu ver', 'Günaydın', 'En çok satan ürün nedir?', 'Abonelik durumumuz nedir?'] },
];

const results = [];

async function ensureUser(tenantId, domain) {
  const email = `temptest-${domain}@test.local`;
  const { data } = await SB.from('users').select('id').eq('tenant_id', tenantId).eq('email', email).maybeSingle();
  if (data) return email;
  await SB.from('users').insert({ tenant_id: tenantId, name: 'Test Owner', email, phone: '05000000000', password: TEST_HASH, role: 'owner', active: true });
  return email;
}
async function cleanupUser(domain) {
  await SB.from('users').delete().eq('email', `temptest-${domain}@test.local`);
}
async function cleanupProduct(tenantId, name) {
  const { data } = await SB.from('products').select('id').eq('tenant_id', tenantId).ilike('product_name', `%${name}%`);
  for (const p of data || []) await SB.from('products').update({ deleted_at: new Date().toISOString(), active: false }).eq('id', p.id);
}
async function cleanupCustomer(tenantId, name) {
  const { data } = await SB.from('customers').select('id').eq('tenant_id', tenantId).ilike('name', `%${name}%`);
  for (const c of data || []) await SB.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', c.id);
}

(async () => {
  const tenants = [];
  for (const p of PROFILES) {
    const t = (await SB.from('tenants').select('id,company_name').eq('domain', p.domain).single()).data;
    if (t) tenants.push({ ...p, id: t.id, company: t.company_name });
  }
  console.log('Profiller:', tenants.map((t) => t.label).join(' | '));

  for (const prof of tenants) {
    console.log(`\n==== ${prof.label} (${prof.company}) ====`);
    await ensureUser(prof.id, prof.domain);
    const login = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `temptest-${prof.domain}@test.local`, password: TEST_PW }) }).then((r) => r.json());
    if (!login.token) { console.log('LOGIN BAŞARISIZ', prof.domain); await cleanupUser(prof.domain); continue; }
    const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + login.token };
    const conv = async (text) => {
      const t0 = Date.now();
      const r = await fetch(`${BASE}/api/ai-employee/${prof.id}/conversation`, { method: 'POST', headers: H, body: JSON.stringify({ text }) }).then((res) => res.json());
      const ms = Date.now() - t0;
      return { r, ms };
    };

    for (const s of prof.scenarios) {
      const { r, ms } = await conv(s);
      results.push({ tenant: prof.domain, scenario: s, latencyMs: ms, ok: !!r.reply });
      console.log(`  [${ms}ms] "${s}" -> ${r.reply?.slice(0, 55) || 'YANIT YOK'}`);
    }

    // Komut + onay (bilgi dışı): ürün ekle → iptal (işlem yapma, sadece onay akışını doğrula)
    const prodName = `Sim${Date.now().toString().slice(-5)}`;
    const { r: c1 } = await conv(`Yeni ürün ekle: ${prodName} 500 TL`);
    console.log(`  Komut(ürün): ${c1.reply?.slice(0, 60)}${c1.pending ? ' [onay bekleniyor]' : ''}`);
    const { r: c2 } = await conv('hayır');
    console.log(`  Onay(iptal): ${c2.reply?.slice(0, 40)}`);
    await cleanupProduct(prof.id, prodName);

    // Müşteri ekle (onaylı çalıştır, sonra temizle)
    const custName = `SimM${Date.now().toString().slice(-5)}`;
    const { r: m1 } = await conv(`Yeni müşteri ekle: ${custName} 05320000000`);
    if (m1.pending) { const { r: m2 } = await conv('evet'); console.log(`  Müşteri(onaylı): ${m2.reply?.slice(0, 50)}`); await cleanupCustomer(prof.id, custName); }
    else console.log(`  Müşteri: ${m1.reply?.slice(0, 50)}`);

    await cleanupUser(prof.domain);
  }

  // Özet
  console.log('\n==== LATENCY ÖZETİ ====');
  const byTenant = {};
  for (const x of results) { (byTenant[x.tenant] ||= []).push(x); }
  for (const [dom, arr] of Object.entries(byTenant)) {
    const avg = Math.round(arr.reduce((s, a) => s + a.latencyMs, 0) / arr.length);
    const ok = arr.filter((a) => a.ok).length;
    console.log(`  ${dom}: ${arr.length} çağrı, ort. ${avg}ms, başarı ${ok}/${arr.length}`);
  }

  console.log('\n==== MALİYET (ai_employee_usage) ====');
  for (const prof of tenants) {
    const { data } = await SB.from('ai_employee_usage').select('kind,cost_estimate,input_tokens,output_tokens,provider').eq('tenant_id', prof.id).gte('created_at', new Date(Date.now() - 600000).toISOString());
    const conv = (data || []).filter((r) => r.kind === 'conversation' || r.kind === 'command');
    const notif = (data || []).filter((r) => r.kind === 'notification');
    const cCost = conv.reduce((s, r) => s + Number(r.cost_estimate || 0), 0);
    const nCost = notif.reduce((s, r) => s + Number(r.cost_estimate || 0), 0);
    console.log(`  ${prof.domain}: konuşma ${conv.length} çağrı (≈ $${cCost.toFixed(5)}), bildirim ${notif.length} (≈ $${nCost.toFixed(5)})`);
  }
})().catch((e) => { console.error('HATA', e.message); process.exit(1); });