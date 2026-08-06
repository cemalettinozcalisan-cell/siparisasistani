'use client';

import { useEffect, useState, useRef } from 'react';
import { Package, Plus, X, Sparkles, Upload, Check, Search } from 'lucide-react';

const SALE_TYPES = ['KG', 'SAP', 'ADET', 'KOLI', 'TEPSI', 'PALET'];
const SALE_LABELS: Record<string, string> = { KG: 'KG', SAP: 'Sap', ADET: 'Adet', KOLI: 'Koli', TEPSI: 'Tepsi', PALET: 'Palet' };

interface Product {
  id: string; product_name: string; category: string; price: number; unit: string;
  active: boolean; sale_types: string[]; variable_weight: boolean;
  avg_weight_gr: number | null; min_weight_gr: number | null; max_weight_gr: number | null;
  ai_rules: string | null; min_order_qty?: number; wholesale_price?: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [slideOpen, setSlideOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    product_name: '', category: '', price: '', unit: 'KG',
    sale_types: ['KG'], variable_weight: false, avg_weight_gr: '', min_weight_gr: '', max_weight_gr: '', ai_rules: '',
    min_order_qty: '', wholesale_price: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    fetch('/api/products/demo-tenant-id').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(Boolean);
    for (let i = 1; i < lines.length; i++) {
      const delim = lines[i].includes(';') ? ';' : ','; // support both comma and semicolon
      const cols = lines[i].split(delim);
      if (cols.length < 2) continue;
      const [product_name, category, price, ...rest] = cols.map(c => c.trim());
      const sale_types = (rest[0] || 'KG').split('/');
      await fetch('/api/products/demo-tenant-id', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: product_name || `Ürün ${i}`, category: category || '',
          price: Number(price) || 0, unit: 'KG', sale_types,
          variable_weight: false, ai_rules: rest[1] || null,
        }),
      });
    }
    load();
    if (e.target) e.target.value = '';
  };

  const toggleSaleType = (t: string) => {
    setForm({ ...form, sale_types: form.sale_types.includes(t) ? form.sale_types.filter(s => s !== t) : [...form.sale_types, t] });
  };

  const handleSubmit = async () => {
    await fetch('/api/products/demo-tenant-id', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_name: form.product_name, category: form.category, price: Number(form.price), unit: form.unit,
        sale_types: form.sale_types, variable_weight: form.variable_weight,
        avg_weight_gr: form.avg_weight_gr ? Number(form.avg_weight_gr) : null,
        min_weight_gr: form.min_weight_gr ? Number(form.min_weight_gr) : null,
        max_weight_gr: form.max_weight_gr ? Number(form.max_weight_gr) : null,
        ai_rules: form.ai_rules || null,
        min_order_qty: form.min_order_qty ? Number(form.min_order_qty) : 0,
        wholesale_price: form.wholesale_price ? Number(form.wholesale_price) : null,
      }),
    });
    setSlideOpen(false);
    setForm({ product_name: '', category: '', price: '', unit: 'KG', sale_types: ['KG'], variable_weight: false, avg_weight_gr: '', min_weight_gr: '', max_weight_gr: '', ai_rules: '', min_order_qty: '', wholesale_price: '' });
    load();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    await fetch(`/api/products/demo-tenant-id/${id}`, { method: 'DELETE' });
    load();
  };
  const toggleActive = async (id: string, active: boolean) => {
    await fetch(`/api/products/demo-tenant-id/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !active }) });
    load();
  };

  const filtered = products.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.product_name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ürünler</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{products.length} ürün</p>
        </div>
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileUpload} />
      </div>

      {/* Search + Upload */}
      {products.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ürün ara..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Upload className="w-4 h-4" /> Excel ile Yükle
            </button>
            <a href="/urun-sablonu.csv" download
              className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              📄 Örnek Şablon
            </a>
            <button onClick={() => setSlideOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm">
              <Plus className="w-4 h-4" /> Ürün Ekle
            </button>
            <button onClick={() => window.open(`/api/products/demo-tenant-id`, '_blank')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm">
              📄 PDF İndir
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {products.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Henüz ürün eklenmemiş</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">İlk ürününüzü ekleyerek AI sipariş almaya başlayın. Ürünlerinizi tek tek veya Excel ile yükleyebilirsiniz.</p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={() => setSlideOpen(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
              <Plus className="w-4 h-4" /> Ürün Ekleyerek Başlayın
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Upload className="w-4 h-4" /> Excel ile Yükle
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center">
            📄 <a href="/urun-sablonu.csv" download className="text-indigo-600 dark:text-indigo-400 hover:underline">Örnek CSV şablonunu indir</a>, Excel'de doldur, kaydet ve yükle. İlk satır başlıktır (silme).
          </p>
        </div>
      ) : (
        /* Product Table */
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Ürün</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Kategori</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Fiyat</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Satış Tipleri</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">AI Kuralı</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Durum</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900 dark:text-white">{p.product_name}</span>
                      {(p as any).min_order_qty > 0 && <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">Min {(p as any).min_order_qty}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.category || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900 dark:text-white">{Number(p.price).toLocaleString('tr-TR')} TL</span>
                      {(p as any).wholesale_price > 0 && <span className="block text-[10px] text-slate-400">Toptan: {Number((p as any).wholesale_price).toLocaleString('tr-TR')} TL</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {(p.sale_types || []).map(t => (
                          <span key={t} className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{SALE_LABELS[t] || t}</span>
                        ))}
                        {p.variable_weight && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">~{p.avg_weight_gr || '?'}gr</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.ai_rules ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                          <Sparkles className="w-3 h-3" /> AI
                        </span>
                      ) : <span className="text-slate-300 dark:text-slate-600">-</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(p.id, p.active)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${p.active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                        {p.active ? 'Aktif' : 'Pasif'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => deleteProduct(p.id)}
                          className="px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over Panel */}
      {slideOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSlideOpen(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">Yeni Ürün Ekle</h2>
              <button onClick={() => setSlideOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Ürün Adı</label>
                  <input value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} placeholder="Örn: Dana Parmak Sucuk"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Kategori</label>
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Örn: Kasap Ürünleri"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Birim Fiyat (TL)</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                </div>
              </div>

              {/* Sale Types */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Satış Tipleri</label>
                <div className="flex gap-1.5 flex-wrap">
                  {SALE_TYPES.map(t => (
                    <button key={t} onClick={() => toggleSaleType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${form.sale_types.includes(t) ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}>
                      {SALE_LABELS[t] || t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variable Weight */}
              <div className="flex items-center gap-2">
                <button onClick={() => setForm({ ...form, variable_weight: !form.variable_weight })}
                  className={`w-9 h-5 rounded-full transition-colors relative ${form.variable_weight ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.variable_weight ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-slate-700 dark:text-slate-300">Değişken Ağırlık (sap/baş)</span>
              </div>
              {form.variable_weight && (
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-[10px] text-slate-400 mb-1">Ort. (gr)</label>
                    <input type="number" value={form.avg_weight_gr} onChange={e => setForm({ ...form, avg_weight_gr: e.target.value })} placeholder="250" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
                  <div><label className="block text-[10px] text-slate-400 mb-1">Min (gr)</label>
                    <input type="number" value={form.min_weight_gr} onChange={e => setForm({ ...form, min_weight_gr: e.target.value })} placeholder="200" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
                  <div><label className="block text-[10px] text-slate-400 mb-1">Max (gr)</label>
                    <input type="number" value={form.max_weight_gr} onChange={e => setForm({ ...form, max_weight_gr: e.target.value })} placeholder="300" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
                </div>
              )}

              {/* Min Order + Wholesale */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Minimum Sipariş</label>
                  <input type="number" value={form.min_order_qty} onChange={e => setForm({ ...form, min_order_qty: e.target.value })} placeholder="0 (yok)"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Toptan Fiyat (TL)</label>
                  <input type="number" value={form.wholesale_price} onChange={e => setForm({ ...form, wholesale_price: e.target.value })} placeholder="Opsiyonel"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                </div>
              </div>

              {/* AI Rule */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5 inline mr-1 text-violet-500" />
                  AI Kuralı
                </label>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
                  <input value={form.ai_rules} onChange={e => setForm({ ...form, ai_rules: e.target.value })} placeholder="Örn: Sap ağırlığı değişir, net fiyat tartımdan sonra"
                    className="w-full pl-9 pr-3 py-2 border border-violet-200 dark:border-violet-800 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700">
              <button onClick={handleSubmit}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
                <Check className="w-4 h-4" /> Ürünü Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
