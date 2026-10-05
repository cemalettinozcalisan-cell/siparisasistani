/**
 * Demo veri düzeltme: ürünsüz siparişlere order_items ekler ve
 * tüm siparişlerin total_price'ını order_items toplamına göre tutarlı hale getirir.
 * Ayrıca geçersiz (miktar/tutar <= 0) satırları onarır. Idempotent.
 *
 * Çalıştır: node apps/api/scripts/fix-order-items.mjs
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TENANT = process.env.DEMO_TENANT_ID || '00000000-0000-0000-0000-000000000001';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// 32-bit UNSIGNED hash (negatif olmaz)
const hashNum = (s) => { let h = 7; for (const c of String(s)) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0; return h >>> 0; };

(async () => {
  const { data: products } = await sb.from('products')
    .select('id, product_name, price, unit').eq('tenant_id', TENANT).is('deleted_at', null);
  const prods = (products || []).filter((p) => Number(p.price) > 0);
  if (!prods.length) { console.error('Ürün yok, çıkılıyor.'); process.exit(1); }

  const { data: orders } = await sb.from('orders')
    .select('id, order_number, total_price').eq('tenant_id', TENANT).is('deleted_at', null).limit(2000);

  let addedItems = 0, repaired = 0, fixedTotals = 0, kept = 0;
  for (const o of orders || []) {
    const h = hashNum(o.order_number);
    const { data: existing } = await sb.from('order_items')
      .select('id, product_name, quantity, unit, unit_price, total').eq('order_id', o.id).is('deleted_at', null);
    let items = existing || [];

    // Geçersiz satırları onar (miktar/tutar <= 0)
    for (const it of items) {
      if (Number(it.quantity) <= 0 || Number(it.total) <= 0) {
        const p = prods.find((x) => x.product_name === it.product_name) || prods[h % prods.length];
        const qty = 1 + (h % 5);
        const unit_price = Number(it.unit_price) > 0 ? Number(it.unit_price) : Number(p.price);
        const total = unit_price * qty;
        await sb.from('order_items').update({ quantity: qty, unit_price, total, unit: it.unit || p.unit || 'KG' }).eq('id', it.id);
        it.quantity = qty; it.unit_price = unit_price; it.total = total;
        repaired++;
      }
    }

    if (!items.length) {
      const cnt = 1 + (h % 2); // 1-2 kalem
      const rows = [];
      for (let i = 0; i < cnt; i++) {
        const p = prods[(h + i * 7) % prods.length];
        const qty = 1 + ((h >>> (i + 1)) % 5);
        const unit_price = Number(p.price);
        rows.push({ order_id: o.id, product_id: p.id, product_name: p.product_name, quantity: qty, unit: p.unit || 'KG', unit_price, total: unit_price * qty });
      }
      const ins = await sb.from('order_items').insert(rows).select('id, total');
      if (ins.error) { console.error('item insert hata', o.order_number, ins.error.message); continue; }
      items = ins.data || [];
      addedItems += items.length;
    } else {
      kept++;
    }

    const sum = items.reduce((s, it) => s + Number(it.total || 0), 0);
    if (sum > 0 && Number(o.total_price) !== sum) {
      const up = await sb.from('orders').update({ total_price: sum }).eq('id', o.id);
      if (!up.error) fixedTotals++;
    }
  }
  console.log(`Bitti. Eklenen item=${addedItems} | onarılan=${repaired} | mevcut items korunan sipariş=${kept} | tutar düzeltilen=${fixedTotals} | toplam sipariş=${(orders || []).length}`);
})();
