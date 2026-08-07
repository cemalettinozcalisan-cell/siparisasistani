'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Package, X, Sparkles, Upload, Check, Search, Download, PackageOpen, Pencil, Trash2, ShoppingBag, Layers, Infinity, AlertTriangle } from 'lucide-react';
import { getTenantId } from '@/lib/tenant';

const SALE_TYPES = ['KG', 'SAP', 'ADET', 'KOLİ', 'TEPSİ', 'PALET'];
const SALE_LABELS: Record<string, string> = { KG: 'KG', SAP: 'Sap', ADET: 'Adet', 'KOLİ': 'Koli', 'TEPSİ': 'Tepsi', 'PALET': 'Palet' };

interface Product {
  id: string; product_name: string; category: string; price: number; unit: string;
  active: boolean; sale_types: string[]; variable_weight: boolean;
  avg_weight_gr: number | null; min_weight_gr: number | null; max_weight_gr: number | null;
  ai_rules: string | null; min_order_qty?: number; wholesale_price?: number;
  stock_qty?: number; min_stock_qty?: number; track_stock?: boolean;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    product_name: '', category: '', price: '', unit: 'KG',
    sale_types: ['KG'], variable_weight: false, avg_weight_gr: '', min_weight_gr: '', max_weight_gr: '', ai_rules: '',
    min_order_qty: '', wholesale_price: '',
    track_stock: false, stock_qty: '', min_stock_qty: '5',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tid = getTenantId();

  const load = () => {
    fetch(`/api/products/${tid}`).then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const activeCount = products.filter(p => p.active).length;
  const criticalStock = products.filter(p => p.track_stock && (p.stock_qty || 0) <= (p.min_stock_qty || 5)).length;
  const categories = useMemo(() => new Set(products.map(p => p.category).filter(Boolean)).size, [products]);

  const openAdd = () => { setEditingProduct(null); setSlideOpen(true); };
  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      product_name: p.product_name, category: p.category || '', price: String(p.price), unit: p.unit,
      sale_types: p.sale_types || ['KG'], variable_weight: p.variable_weight || false,
      avg_weight_gr: p.avg_weight_gr ? String(p.avg_weight_gr) : '', min_weight_gr: p.min_weight_gr ? String(p.min_weight_gr) : '',
      max_weight_gr: p.max_weight_gr ? String(p.max_weight_gr) : '', ai_rules: p.ai_rules || '',
      min_order_qty: p.min_order_qty ? String(p.min_order_qty) : '', wholesale_price: p.wholesale_price ? String(p.wholesale_price) : '',
      track_stock: p.track_stock || false, stock_qty: p.stock_qty ? String(p.stock_qty) : '', min_stock_qty: p.min_stock_qty ? String(p.min_stock_qty) : '5',
    });
    setSlideOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(Boolean);
    const delim = text.includes(';') ? ';' : ',';
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delim).map(c => c.trim());
      if (cols.length < 2) continue;
      const product_name = cols[0] || `Ürün ${i}`;
      const category = cols[1] || '';
      const price = Number(cols[2]) || 0;
      const unit = cols[3] || 'KG';
      const sale_types = (cols[4] || 'KG').split('/');
      const min_order_qty = Number(cols[5]) || 0;
      const wholesale_price = Number(cols[6]) || null;
      const track_stock = (cols[7] || 'Hayır').toLowerCase() === 'evet';
      const stock_qty = track_stock ? Number(cols[8]) || 0 : 0;
      const min_stock_qty = track_stock ? Number(cols[9]) || 5 : 5;
      const ai_rules = cols[10] || null;
      await fetch(`/api/products/${tid}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_name, category, price, unit, sale_types, min_order_qty, wholesale_price: wholesale_price || 0, variable_weight: false, track_stock, stock_qty, min_stock_qty, ai_rules }),
      });
    }
    load();
    if (e.target) e.target.value = '';
  };

  const toggleSaleType = (t: string) => {
    setForm({ ...form, sale_types: form.sale_types.includes(t) ? form.sale_types.filter(s => s !== t) : [...form.sale_types, t] });
  };

  const buildProductBody = () => ({
    product_name: form.product_name, category: form.category, price: Number(form.price), unit: form.unit,
    sale_types: form.sale_types, variable_weight: form.variable_weight,
    avg_weight_gr: form.avg_weight_gr ? Number(form.avg_weight_gr) : null,
    min_weight_gr: form.min_weight_gr ? Number(form.min_weight_gr) : null,
    max_weight_gr: form.max_weight_gr ? Number(form.max_weight_gr) : null,
    ai_rules: form.ai_rules || null,
    min_order_qty: form.min_order_qty ? Number(form.min_order_qty) : 0,
    wholesale_price: form.wholesale_price ? Number(form.wholesale_price) : null,
    track_stock: form.track_stock,
    stock_qty: form.track_stock && form.stock_qty ? Number(form.stock_qty) : 0,
    min_stock_qty: form.track_stock && form.min_stock_qty ? Number(form.min_stock_qty) : 5,
  });

  const handleSubmit = async () => {
    const body = buildProductBody();
    if (editingProduct) {
      await fetch(`/api/products/${tid}/${editingProduct.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch(`/api/products/${tid}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setSlideOpen(false);
    setForm({ product_name: '', category: '', price: '', unit: 'KG', sale_types: ['KG'], variable_weight: false, avg_weight_gr: '', min_weight_gr: '', max_weight_gr: '', ai_rules: '', min_order_qty: '', wholesale_price: '', track_stock: false, stock_qty: '', min_stock_qty: '5' });
    load();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    await fetch(`/api/products/${tid}/${id}`, { method: 'DELETE' });
    load();
  };
  const toggleActive = async (id: string, active: boolean) => {
    await fetch(`/api/products/${tid}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !active }) });
    load();
  };

  const filtered = products.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.product_name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
  });

  const isStockCritical = (p: Product) => p.track_stock && (p.stock_qty || 0) <= (p.min_stock_qty || 5);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag size={22} className="text-indigo-500" /> Ürünler
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{products.length} ürün</p>
        </div>
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileUpload} />
      </div>

      {/* KPI Cards */}
      {products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Toplam Ürün', value: products.length, icon: ShoppingBag, gradient: 'from-blue-500 to-cyan-500' },
            { label: 'Aktif Ürün', value: activeCount, icon: Check, gradient: 'from-emerald-500 to-green-500' },
            { label: 'Kritik Stok', value: criticalStock, icon: AlertTriangle, gradient: criticalStock > 0 ? 'from-red-500 to-rose-600' : 'from-amber-500 to-orange-500' },
            { label: 'Kategori', value: categories, icon: Layers, gradient: 'from-violet-500 to-purple-500' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-3.5 flex items-center gap-3 hover:shadow-md transition-all">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                <kpi.icon size={17} className="text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{kpi.value}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + Buttons */}
      {products.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ürün ara..."
              className="w-full pl-9 pr-3 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 h-9 px-3 border-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
              <Upload size={14} /> Excel ile Yükle
            </button>
            <a href="/urun-sablonu.csv" download
              className="inline-flex items-center gap-1.5 h-9 px-3 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all">
              <Download size={14} /> Örnek Şablon
            </a>
            <button onClick={openAdd}
              className="inline-flex items-center gap-1.5 h-9 px-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm">
              <Package size={14} /> Ürün Ekle
            </button>
            <button onClick={() => window.open(`/api/products/catalog/${tid}`, '_blank')}
              className="inline-flex items-center gap-1.5 h-9 px-3 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:border-red-300 hover:text-red-500 dark:hover:border-red-800 dark:hover:text-red-400 transition-all">
              <Download size={14} /> PDF İndir
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {products.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/30 p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-violet-50/50 dark:from-indigo-900/5 dark:to-violet-900/5 -z-0" />
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/10 border border-indigo-200 dark:border-indigo-900/40">
              <PackageOpen size={36} className="text-indigo-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Henüz Ürün Tanımlanmadı</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
              Müşterilerinizin WhatsApp, Telefon veya Instagram üzerinden sipariş verebilmesi için ürünlerinizi tanımlayın veya Excel ile toplu yükleyin.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <button onClick={openAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-500/20">
                <Package size={15} /> İlk Ürününü Ekle
              </button>
              <button onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                <Upload size={15} /> Excel ile Toplu Yükle
              </button>
              <a href="/urun-sablonu.csv" download
                className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all">
                <Download size={15} /> Örnek Şablonu İndir
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Product Table */
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider w-10"></th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Ürün</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Kategori</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Fiyat</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Satış Tipleri</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Stok</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Durum</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map(p => {
                  const critical = isStockCritical(p);
                  return (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
                        <Package size={16} className="text-indigo-500" />
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{p.product_name}</span>
                      {(p as any).min_order_qty > 0 && <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">Min {(p as any).min_order_qty}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">{p.category || '-'}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{Number(p.price).toLocaleString('tr-TR')} TL</span>
                      {(p as any).wholesale_price > 0 && <span className="block text-[10px] text-slate-400 mt-0.5">Toptan: {Number((p as any).wholesale_price).toLocaleString('tr-TR')} TL</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {(p.sale_types || []).map(t => (
                          <span key={t} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">{SALE_LABELS[t] || t}</span>
                        ))}
                        {p.variable_weight && <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">~{p.avg_weight_gr || '?'}gr</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {p.track_stock ? (
                        critical ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 shadow-sm">
                            <AlertTriangle size={10} /> {p.stock_qty || 0} {p.unit || 'KG'}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{p.stock_qty || 0} {p.unit || 'KG'}</span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                          <Infinity size={12} /> Sınırsız
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => toggleActive(p.id, p.active)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-sm transition-colors ${p.active ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>
                        {p.active ? 'Aktif' : 'Pasif'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)}
                          className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all" title="Düzenle">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deleteProduct(p.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Sil">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">{editingProduct ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</h2>
              <button onClick={() => setSlideOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X size={20} /></button>
            </div>

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

              {/* Stock Management */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-3 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Stok Takibi Yapılsın mı?</span>
                  <button onClick={() => setForm({ ...form, track_stock: !form.track_stock })}
                    className={`w-9 h-5 rounded-full transition-colors relative ${form.track_stock ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.track_stock ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {form.track_stock && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Mevcut Stok Miktarı</label>
                      <input type="number" value={form.stock_qty} onChange={e => setForm({ ...form, stock_qty: e.target.value })} placeholder="150"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Kritik Stok Uyarı Sınırı</label>
                      <input type="number" value={form.min_stock_qty} onChange={e => setForm({ ...form, min_stock_qty: e.target.value })} placeholder="5"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    </div>
                  </div>
                )}
                {!form.track_stock && (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1"><Infinity size={12} /> Stok takibi kapalı — ürün sınırsız sayılacak</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  <Sparkles size={14} className="inline mr-1 text-violet-500" />
                  AI Kuralı
                </label>
                <div className="relative">
                  <Sparkles size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400" />
                  <input value={form.ai_rules} onChange={e => setForm({ ...form, ai_rules: e.target.value })} placeholder="Örn: Sap ağırlığı değişir, net fiyat tartımdan sonra"
                    className="w-full pl-9 pr-3 py-2 border border-violet-200 dark:border-violet-800 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700">
              <button onClick={handleSubmit}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
                <Check size={16} /> {editingProduct ? 'Değişiklikleri Kaydet' : 'Ürünü Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
