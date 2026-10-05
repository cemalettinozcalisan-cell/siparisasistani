/**
 * Birim normalizasyonu: products.unit ve order_items.unit içindeki
 * "kilogram/kg/kilo" → "KG", "adet/tane" → "ADET", "koli/kasa" → "KOLI", "tepsi" → "TEPSI".
 * Çalıştır: node apps/api/scripts/normalize-units.mjs
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const TENANT = process.env.DEMO_TENANT_ID || '00000000-0000-0000-0000-000000000001';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const UNIT_CANON = {
  kg: 'KG', kilogram: 'KG', kilo: 'KG', kilograms: 'KG', kgs: 'KG',
  adet: 'ADET', piece: 'ADET', pieces: 'ADET', tane: 'ADET',
  koli: 'KOLI', kasa: 'KOLI', box: 'KOLI', tepsi: 'TEPSI', tray: 'TEPSI',
};
const norm = (v) => { const k = String(v ?? '').trim().toLowerCase(); return UNIT_CANON[k] || (k ? k.toUpperCase() : null); };

async function fixTable(table, hasTenant = true) {
  let q = sb.from(table).select('id, unit').not('unit', 'is', null).limit(5000);
  if (hasTenant) q = q.eq('tenant_id', TENANT);
  const { data } = await q;
  let changed = 0;
  for (const r of data || []) {
    const c = norm(r.unit);
    if (c && c !== r.unit) {
      const up = await sb.from(table).update({ unit: c }).eq('id', r.id);
      if (!up.error) changed++;
    }
  }
  return changed;
}

(async () => {
  const p = await fixTable('products', true);
  const oi = await fixTable('order_items', false);
  console.log(`Bitti. products düzeltilen=${p} | order_items düzeltilen=${oi}`);
})();
