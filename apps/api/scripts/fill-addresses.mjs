/**
 * Demo adres doldurma (P33): address'i null olan müşterilere şehirlerine uygun demo adres atar.
 * Çalıştır: node apps/api/scripts/fill-addresses.mjs
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const TENANT = process.env.DEMO_TENANT_ID || '00000000-0000-0000-0000-000000000001';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const STREETS = ['Atatürk Cd.', 'Cumhuriyet Cd.', 'İnönü Cd.', 'Milli Egemenlik Cd.', 'İstiklal Cd.', 'Fatih Cd.', 'Yunus Emre Cd.', 'Mevlana Cd.'];
const NEIGH = ['Merkez', 'Yeni Mah.', 'Cumhuriyet Mah.', 'Bahçelievler Mah.', 'Kurtuluş Mah.', 'Hürriyet Mah.', 'Çamlık Mah.', 'Zafer Mah.'];

function makeAddress(name, city, i) {
  const no = 1 + ((i * 7 + name.length) % 120);
  const dair = 1 + (i % 20);
  const street = STREETS[i % STREETS.length];
  const neigh = NEIGH[(i + 3) % NEIGH.length];
  return `${neigh} ${street} No:${no} Daire:${dair}, ${city || 'Merkez'}`;
}

(async () => {
  const { data } = await sb.from('customers').select('id, name, city, address')
    .eq('tenant_id', TENANT).is('deleted_at', null).limit(2000);
  const rows = data || [];
  let filled = 0;
  let i = 0;
  for (const c of rows) {
    i++;
    if (c.address && String(c.address).trim()) continue;
    const addr = makeAddress(c.name || 'Müşteri', c.city, i);
    const up = await sb.from('customers').update({ address: addr }).eq('id', c.id);
    if (!up.error) filled++;
  }
  console.log(`Bitti. Adres doldurulan müşteri=${filled} | toplam=${rows.length}`);
})();
