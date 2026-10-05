/**
 * Müşteri tekrarlarını birleştirir (P31):
 * Aynı (isim, telefon) grubunda EN ÇOK siparişi olan kaydı tutar;
 * diğer kayıtların siparişlerini tutulan kayda taşır; diğerlerini soft-delete eder.
 * Çalıştır: node apps/api/scripts/dedupe-customers.mjs
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const TENANT = process.env.DEMO_TENANT_ID || '00000000-0000-0000-0000-000000000001';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data } = await sb.from('customers').select('id, name, phone, city, created_at')
    .eq('tenant_id', TENANT).is('deleted_at', null).limit(3000);
  const rows = data || [];
  const groups = {};
  for (const r of rows) { const k = `${r.name}|${r.phone || ''}`; (groups[k] = groups[k] || []).push(r); }

  let mergedGroups = 0, movedOrders = 0, softDeleted = 0;
  for (const [k, list] of Object.entries(groups)) {
    if (list.length < 2) continue;
    // Her kaydın sipariş sayısı
    const scored = [];
    for (const c of list) {
      const { count } = await sb.from('orders').select('id', { count: 'exact', head: true })
        .eq('tenant_id', TENANT).eq('customer_id', c.id).is('deleted_at', null);
      scored.push({ c, count: count || 0 });
    }
    scored.sort((a, b) => (b.count - a.count) || (new Date(a.c.created_at) - new Date(b.c.created_at)));
    const keep = scored[0].c;
    const dups = scored.slice(1).map((s) => s.c);
    for (const d of dups) {
      // Siparişleri tutulan kayda taşı
      const up = await sb.from('orders').update({ customer_id: keep.id })
        .eq('tenant_id', TENANT).eq('customer_id', d.id).is('deleted_at', null).select('id');
      movedOrders += (up.data || []).length;
      // conversation_sessions phone ile bağlı olabilir; tutulan müşterinin telefonu aynı → dokunmaya gerek yok
      const del = await sb.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', d.id);
      if (!del.error) softDeleted++;
    }
    mergedGroups++;
  }
  console.log(`Bitti. Birleştirilen grup=${mergedGroups} | taşınan sipariş=${movedOrders} | soft-delete müşteri=${softDeleted}`);
})();
