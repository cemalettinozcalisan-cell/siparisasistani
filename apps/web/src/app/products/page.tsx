'use client';

import { useEffect, useState } from 'react';

interface Product {
  id: string;
  product_name: string;
  category: string;
  price: number;
  unit: string;
  active: boolean;
  sale_types: string[];
  variable_weight: boolean;
  avg_weight_gr: number | null;
  min_weight_gr: number | null;
  max_weight_gr: number | null;
  ai_rules: string | null;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    product_name: '', category: '', price: '', unit: 'KG',
    sale_types: ['KG'], variable_weight: false, avg_weight_gr: '', min_weight_gr: '', max_weight_gr: '', ai_rules: '',
  });

  const load = () => {
    fetch('/api/products/demo-tenant-id')
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    await fetch('/api/products/demo-tenant-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_name: form.product_name, category: form.category, price: Number(form.price), unit: form.unit,
        sale_types: form.sale_types, variable_weight: form.variable_weight,
        avg_weight_gr: form.avg_weight_gr ? Number(form.avg_weight_gr) : null,
        min_weight_gr: form.min_weight_gr ? Number(form.min_weight_gr) : null,
        max_weight_gr: form.max_weight_gr ? Number(form.max_weight_gr) : null,
        ai_rules: form.ai_rules || null,
      }),
    });
    setShowForm(false);
    setForm({ product_name: '', category: '', price: '', unit: 'KG' });
    load();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await fetch(`/api/products/demo-tenant-id/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    load();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Urunler</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Urun Ekle
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input placeholder="Urun adı" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input placeholder="Kategori" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input placeholder="KG Fiyatı" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="flex gap-3 items-center">
            <label className="text-sm">Satış Tipleri:</label>
            {['KG', 'SAP', 'ADET', 'KOLI'].map((t) => (
              <label key={t} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={form.sale_types.includes(t)}
                  onChange={() => setForm({
                    ...form, sale_types: form.sale_types.includes(t)
                      ? form.sale_types.filter((s) => s !== t) : [...form.sale_types, t],
                  })} />
                {t === 'SAP' ? 'Sap (Adet)' : t}
              </label>
            ))}
            <label className="flex items-center gap-1 text-sm ml-4">
              <input type="checkbox" checked={form.variable_weight}
                onChange={() => setForm({ ...form, variable_weight: !form.variable_weight })} />
              Değişken Ağırlık
            </label>
          </div>
          {form.variable_weight && (
            <div className="grid grid-cols-3 gap-3">
              <input placeholder="Ort. ağırlık (gr)" type="number" value={form.avg_weight_gr}
                onChange={(e) => setForm({ ...form, avg_weight_gr: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input placeholder="Min ağırlık (gr)" type="number" value={form.min_weight_gr}
                onChange={(e) => setForm({ ...form, min_weight_gr: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input placeholder="Max ağırlık (gr)" type="number" value={form.max_weight_gr}
                onChange={(e) => setForm({ ...form, max_weight_gr: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          )}
          <input placeholder="AI Kuralı (opsiyonel: Orn. 'Sap ağırlığı değişir, net fiyat tartımdan sonra')"
            value={form.ai_rules} onChange={(e) => setForm({ ...form, ai_rules: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Kaydet</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        {products.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium text-gray-900">{p.product_name}</div>
              <div className="text-sm text-gray-500">
                {p.category && `${p.category} · `}
                {Number(p.price).toLocaleString('tr-TR')} TL/{p.unit}
                {p.sale_types && ` · Satış: ${p.sale_types.join(' / ')}`}
                {p.variable_weight && ` · ~${p.avg_weight_gr || '?'}gr/sap`}
                {p.ai_rules && <span className="block text-xs text-gray-400 mt-0.5">{p.ai_rules}</span>}
              </div>
            </div>
            <button
              onClick={() => toggleActive(p.id, p.active)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {p.active ? 'Aktif' : 'Pasif'}
            </button>
          </div>
        ))}
        {products.length === 0 && (
          <div className="p-8 text-center text-gray-400">Henüz ürün eklenmemiş</div>
        )}
      </div>
    </div>
  );
}
