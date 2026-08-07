'use client';

import { getTenantId } from '@/lib/tenant';

import { useEffect, useState } from 'react';
import { PhoneCall, MessageCircle, Pencil } from 'lucide-react';

interface CustomerDetailProps {
  customer: Record<string, unknown>;
  orders: Record<string, unknown>[];
  timeline: Record<string, unknown>[];
  complaints: Record<string, unknown>[];
  onRefresh: () => void;
}

function getSegment(customer: Record<string, unknown>, ordersCount: number, totalSpent: number): { label: string; icon: string; color: string } {
  if (totalSpent >= 50000) return { label: 'VIP', icon: '🥇', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
  if (ordersCount >= 10) return { label: 'Sadık', icon: '🥈', color: 'bg-blue-100 text-blue-800 border-blue-300' };
  if (ordersCount <= 1) return { label: 'Yeni', icon: '🟢', color: 'bg-green-100 text-green-800 border-green-300' };
  return { label: 'Aktif', icon: '✅', color: 'bg-gray-100 text-gray-800 border-gray-300' };
}

export function CustomerDetail({ customer, orders, timeline, complaints }: CustomerDetailProps) {
  const [customerPrices, setCustomerPrices] = useState<Record<string, unknown>[]>([]);
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [priceForm, setPriceForm] = useState({ product_name: '', unit: 'KG', price: '', min_quantity: '' });
  const [products, setProducts] = useState<Array<{ product_name: string; unit: string; price: number }>>([]);
  const [userRole, setUserRole] = useState('owner');

  useEffect(() => { try { setUserRole(JSON.parse(localStorage.getItem('auth_user') || '{}').role || 'owner'); } catch {} }, []);
  useEffect(() => {
    fetch(`/api/products/${tid}`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setProducts(d.map((p: any) => ({
        product_name: p.product_name || p.name || '', unit: p.unit || 'KG', price: Number(p.price || 0),
      })));
    }).catch(() => {});
  }, []);

  const tid = getTenantId();

  const loadPrices = () => {
    fetch(`/api/customer-prices/${tid}/${customer.id}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setCustomerPrices(d); }).catch(() => {});
  };
  useEffect(() => { loadPrices(); }, [customer.id]);

  const handleAddPrice = async () => {
    await fetch(`/api/customer-prices/${tid}/${customer.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_name: priceForm.product_name, unit: priceForm.unit, price: Number(priceForm.price), min_quantity: Number(priceForm.min_quantity) || 0 }),
    });
    setPriceForm({ product_name: '', unit: 'KG', price: '', min_quantity: '' });
    setShowPriceForm(false);
    loadPrices();
  };

  const handleDeletePrice = async (id: string) => {
    await fetch(`/api/customer-prices/${tid}/${customer.id}/${id}`, { method: 'DELETE' });
    loadPrices();
  };

  const totalSpent = orders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const avgBasket = orders.length > 0 ? Math.round(totalSpent / orders.length) : 0;
  const segment = getSegment(customer, orders.length, totalSpent);
  const daysSinceLastOrder = orders.length > 0
    ? Math.floor((Date.now() - new Date(orders[0].created_at as string).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const productCounts: Record<string, number> = {};
  orders.forEach((o: Record<string, unknown>) => {
    const items = o.items as Record<string, unknown>[] | undefined;
    if (items) items.forEach((item) => {
      const name = (item.product_name as string) || '';
      productCounts[name] = (productCounts[name] || 0) + Number(item.quantity || 0);
    });
  });
  const topProducts = Object.entries(productCounts).sort(([, a], [, b]) => b - a).slice(0, 3);

  const insightParts: string[] = [];
  insightParts.push(`Son ${orders.length} sipariş verdi.`);
  insightParts.push(`Ortalama sepet ${avgBasket.toLocaleString('tr-TR')} TL.`);
  if (topProducts.length > 0) insightParts.push(`En çok ${topProducts[0][0]} alıyor.`);
  if (daysSinceLastOrder > 60) insightParts.push(`${daysSinceLastOrder} gündür sipariş vermemiş. Yeniden kazanılabilir.`);
  else if (daysSinceLastOrder <= 7) insightParts.push('Son 7 günde sipariş vermiş, aktif müşteri.');
  if (complaints.length > 0) insightParts.push(`${complaints.length} şikayet kaydı var, öncelikli ilgilenilmeli.`);

  const riskScore = daysSinceLastOrder > 180 ? '🔴 Yüksek Risk' : daysSinceLastOrder > 90 ? '🟡 Orta Risk' : daysSinceLastOrder <= 7 ? '🟢 Düşük Risk (Aktif)' : '🟢 Düşük Risk';

  return (
    <div className="space-y-3">
      {/* Header with button group */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-md shrink-0">
              {((customer.name as string) || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{customer.name as string}</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 font-mono">{(customer.phone as string || '').replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            <button onClick={() => window.open(`tel:${customer.phone}`, '_blank')}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm hover:shadow transition-all">
              <PhoneCall size={13} /> Ara
            </button>
            <button onClick={() => window.open(`https://wa.me/${customer.phone}`, '_blank')}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-sm hover:shadow transition-all">
              <MessageCircle size={13} /> WhatsApp
            </button>
            <button onClick={() => alert('Müşteri düzenleme özelliği bir sonraki güncellemede eklenecektir.')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm transition-all">
              <Pencil size={12} /> Düzenle
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${segment.color}`}>{segment.icon} {segment.label}</span>
          {Boolean((customer as any).address) && <span className="text-xs text-gray-400 truncate">📍 {(customer as any).address}</span>}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { v: orders.length, l: 'Sipariş', cls: 'bg-blue-50 border-blue-200 text-blue-700' },
          { v: `${totalSpent.toLocaleString('tr-TR')} TL`, l: 'Harcama', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { v: `${avgBasket.toLocaleString('tr-TR')} TL`, l: 'Ort. Sepet', cls: 'bg-violet-50 border-violet-200 text-violet-700' },
          { v: daysSinceLastOrder > 999 ? '-' : `${daysSinceLastOrder} gün`, l: 'Son Sip.', cls: 'bg-amber-50 border-amber-200 text-amber-700' },
          { v: complaints.length, l: 'Şikayet', cls: 'bg-red-50 border-red-200 text-red-700' },
        ].map((s, i) => (
          <div key={i} className={`rounded-lg border p-2.5 text-center ${s.cls}`}>
            <div className="text-lg font-bold">{s.v}</div>
            <div className="text-[10px] opacity-70">{s.l}</div>
          </div>
        ))}
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* LEFT COLUMN */}
        <div className="space-y-3">
          {/* İletişim & Fatura */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">İletişim & Fatura</h3>
            <div className="space-y-1 text-xs">
              {Boolean((customer as any).address) && <div><span className="text-gray-400">Adres:</span> <span className="text-gray-700 dark:text-slate-300 ml-1">{(customer as any).address}</span></div>}
              {Boolean((customer as any).city) && <div><span className="text-gray-400">Şehir:</span> <span className="text-gray-700 dark:text-slate-300 ml-1">{(customer as any).city}</span></div>}
              {Boolean((customer as any).identity_number) && <div><span className="text-gray-400">{Boolean((customer as any).company_name) ? 'VKN:' : 'TCKN:'}</span> <span className="text-gray-700 dark:text-slate-300 ml-1">{(customer as any).identity_number}</span></div>}
              {Boolean((customer as any).company_name) && <div><span className="text-gray-400">Firma:</span> <span className="text-gray-700 dark:text-slate-300 ml-1">{(customer as any).company_name}</span></div>}
              {Boolean((customer as any).tax_office) && <div><span className="text-gray-400">Vergi Dairesi:</span> <span className="text-gray-700 dark:text-slate-300 ml-1">{(customer as any).tax_office}</span></div>}
              {Boolean((customer as any).birth_date) && <div><span className="text-gray-400">Doğum:</span> <span className="text-gray-700 dark:text-slate-300 ml-1">{new Date((customer as any).birth_date as string).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</span></div>}
              {Boolean((customer as any).notes) && <div><span className="text-gray-400">Not:</span> <span className="text-gray-700 dark:text-slate-300 ml-1">{(customer as any).notes}</span></div>}
              {!((customer as any).address) && !((customer as any).identity_number) && !((customer as any).company_name) && (
                <div className="text-gray-400 italic">Henüz bilgi girilmemiş</div>
              )}
            </div>
          </div>

          {/* Cari Durum */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Cari Durum</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                <span className="text-[10px] text-slate-400 uppercase">Bakiye</span>
                <p className={`text-sm font-bold mt-0.5 ${Number((customer as any).balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {Number((customer as any).balance || 0).toLocaleString('tr-TR')} TL
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                <span className="text-[10px] text-slate-400 uppercase">Limit</span>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{Number((customer as any).credit_limit || 0).toLocaleString('tr-TR')} TL</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                <span className="text-[10px] text-slate-400 uppercase">Vade</span>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{Number((customer as any).payment_term || 0) > 0 ? `${(customer as any).payment_term} Gün` : 'Peşin'}</p>
              </div>
            </div>
          </div>

          {/* Özel Fiyat */}
          {userRole !== 'staff' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Özel Fiyat Listesi</h3>
              <button onClick={() => setShowPriceForm(!showPriceForm)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 shadow-sm transition-all">
                + Özel Fiyat
              </button>
            </div>
            {showPriceForm && (
              <div className="grid grid-cols-2 gap-1.5 mb-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <select value={priceForm.product_name} onChange={(e) => {
                  const sel = products.find(p => p.product_name === e.target.value);
                  setPriceForm({ ...priceForm, product_name: e.target.value, unit: sel?.unit || 'KG', price: sel?.price ? String(sel.price) : priceForm.price });
                }}
                  className="col-span-2 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-[11px] bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                  <option value="">-- Ürün Seçin --</option>
                  {products.map(p => (<option key={p.product_name} value={p.product_name}>{p.product_name} ({p.price.toLocaleString('tr-TR')} TL/{p.unit})</option>))}
                </select>
                <select value={priceForm.unit} onChange={(e) => setPriceForm({ ...priceForm, unit: e.target.value })}
                  className="px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-[11px] bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                  <option value="KG">KG</option>
                  <option value="GR">GR</option>
                  <option value="ADET">ADET</option>
                  <option value="SAP">SAP</option>
                  <option value="KOLİ">KOLİ</option>
                  <option value="TEPSİ">TEPSİ</option>
                  <option value="PALET">PALET</option>
                </select>
                <input placeholder="Fiyat (TL)" type="number" value={priceForm.price} onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                  className="px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-[11px] bg-white dark:bg-slate-800" />
                <button onClick={handleAddPrice} className="col-span-2 px-2 py-1 bg-indigo-500 text-white rounded text-[11px] font-medium">Kaydet</button>
              </div>
            )}
            {(customerPrices as any[]).length === 0 && !showPriceForm ? (
              <p className="text-[11px] text-gray-400 italic">Henüz özel fiyat yok.</p>
            ) : (customerPrices as any[]).map((p, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <div>
                  <span className="text-[11px] font-medium text-gray-900 dark:text-white">{p.product_name}</span>
                  {p.min_quantity > 0 && <span className="text-[10px] text-gray-400 ml-1">(Min {p.min_quantity} {p.unit})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">{Number(p.price).toLocaleString('tr-TR')} TL/{p.unit}</span>
                  <button onClick={() => handleDeletePrice(p.id)} className="text-[10px] text-red-400 hover:text-red-600">✕</button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-3">
          {/* AI Insights */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">🤖 AI Müşteri Analizi</h3>
            <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">{insightParts.join(' ')}</p>
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <span className="text-[10px] text-gray-400">Risk Skoru:</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${riskScore.includes('Yüksek') ? 'bg-red-100 text-red-700' : riskScore.includes('Orta') ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{riskScore}</span>
              {complaints.length > 0 && <span className="text-[10px] text-red-500">⚠️ {complaints.length} şikayet</span>}
            </div>
          </div>

          {/* Top Products */}
          {topProducts.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">En Çok Alınan Ürünler</h3>
              <div className="space-y-1">
                {topProducts.map(([name, qty], i) => (
                  <div key={i} className="flex justify-between text-[11px] bg-slate-50 dark:bg-slate-700/50 rounded px-2 py-1.5">
                    <span className="text-gray-700 dark:text-slate-300 truncate">{name}</span>
                    <span className="font-medium text-gray-900 dark:text-white shrink-0 ml-2">{qty} adet</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Son Siparişler */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Son Siparişler</h3>
            {orders.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">Henüz sipariş yok</p>
            ) : (
              <div className="space-y-1">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.id as string} className="flex items-center justify-between py-1 text-[11px]">
                    <span className="font-medium text-gray-900 dark:text-white">#{(o as any).order_number}</span>
                    <span className="text-gray-500">{Number(o.total_price || 0).toLocaleString('tr-TR')} TL</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Aktivite Geçmişi */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Aktivite Geçmişi</h3>
            {timeline.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">Aktivite bulunmuyor</p>
            ) : (
              <div className="space-y-1.5">
                {timeline.slice(0, 8).map((entry, i) => (
                  <div key={i} className="flex gap-2 text-[11px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-gray-700 dark:text-slate-300">{entry.description as string}</p>
                      <p className="text-[10px] text-gray-400">{new Date(entry.created_at as string).toLocaleString('tr-TR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
