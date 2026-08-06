'use client';

import { useEffect, useState } from 'react';

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
  const [userRole, setUserRole] = useState('owner');

  useEffect(() => { try { setUserRole(JSON.parse(localStorage.getItem('auth_user') || '{}').role || 'owner'); } catch {} }, []);

  const tid = '00000000-0000-0000-0000-000000000001';

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-md shrink-0">
              {((customer.name as string) || '?')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{customer.name as string}</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 font-mono tracking-wide">{(customer.phone as string || '').replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4')}</p>
              {Boolean((customer as any).address) && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">📍 {(customer as any).address}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); window.open(`tel:${customer.phone}`, '_blank'); }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-blue-500 hover:bg-blue-600 shadow-sm transition-all">
              📞 Ara
            </button>
            <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${customer.phone}`, '_blank'); }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm transition-all">
              💬 WhatsApp
            </button>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${segment.color}`}>{segment.icon} {segment.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3 mt-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-blue-700">{orders.length}</div>
            <div className="text-xs text-blue-600">Sipariş</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-green-700">{totalSpent.toLocaleString('tr-TR')} TL</div>
            <div className="text-xs text-green-600">Toplam Harcama</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-purple-700">{avgBasket.toLocaleString('tr-TR')} TL</div>
            <div className="text-xs text-purple-600">Ort. Sepet</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-amber-700">{daysSinceLastOrder > 999 ? '-' : `${daysSinceLastOrder} gün`}</div>
            <div className="text-xs text-amber-600">Son Sipariş</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-red-700">{complaints.length}</div>
            <div className="text-xs text-red-600">Şikayet</div>
          </div>
        </div>

        {/* İletişim & Fatura Bilgileri */}
        <div className="mt-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
              <span className="text-sm">📋</span>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">İletişim & Fatura</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {Boolean((customer as any).address) && <div><span className="text-gray-400">Adres:</span> <span className="text-gray-700 dark:text-slate-300 ml-1">{(customer as any).address}</span></div>}
            {Boolean((customer as any).city) && <div><span className="text-gray-400">Şehir:</span> <span className="text-gray-700 dark:text-slate-300 ml-1">{(customer as any).city}</span></div>}
            {Boolean((customer as any).identity_number) && <div><span className="text-gray-400">TCKN/VKN:</span> <span className="text-gray-700 dark:text-slate-300 ml-1">{(customer as any).identity_number}</span></div>}
            {Boolean((customer as any).company_name) && <div><span className="text-gray-400">Firma:</span> <span className="text-gray-700 dark:text-slate-300 ml-1">{(customer as any).company_name}</span></div>}
            {Boolean((customer as any).tax_office) && <div><span className="text-gray-400">Vergi Dairesi:</span> <span className="text-gray-700 dark:text-slate-300 ml-1">{(customer as any).tax_office}</span></div>}
            {Boolean((customer as any).birth_date) && <div><span className="text-gray-400">Doğum:</span> <span className="text-gray-700 dark:text-slate-300 ml-1">{new Date((customer as any).birth_date as string).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</span></div>}
            {Boolean((customer as any).notes) && <div className="col-span-2"><span className="text-gray-400">Not:</span> <span className="text-gray-700 dark:text-slate-300 ml-1">{(customer as any).notes}</span></div>}
            {!((customer as any).address) && !((customer as any).identity_number) && !((customer as any).company_name) && (
              <div className="col-span-2 text-gray-400 italic">Henüz iletişim/fatura bilgisi girilmemiş</div>
            )}
          </div>
        </div>

        {/* Cari Durum */}
        <div className="mt-4 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <span className="text-sm">💰</span>
            </div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Cari Durum</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 text-center">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Bakiye</span>
              <p className={`text-sm font-bold mt-0.5 ${Number((customer as any).balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {Number((customer as any).balance || 0).toLocaleString('tr-TR')} TL
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 text-center">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Limit</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{Number((customer as any).credit_limit || 0).toLocaleString('tr-TR')} TL</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 text-center">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Vade</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{Number((customer as any).payment_term || 0) > 0 ? `${(customer as any).payment_term} Gün` : 'Peşin'}</p>
            </div>
          </div>
        </div>

        {/* Ozel Fiyat Listesi */}
        {userRole !== 'staff' && (
        <div className="mt-4 bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg p-3 border border-sky-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span>🏷️</span>
              <span className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Özel Fiyat Listesi</span>
            </div>
            <button onClick={() => setShowPriceForm(!showPriceForm)} className="text-xs font-medium text-sky-600 hover:text-sky-800">
              + Fiyat Ekle
            </button>
          </div>
          <p className="text-xs text-sky-600 mb-2">Bu müşteriye özel fiyatlar. Sipariş alınırken otomatik uygulanır.</p>

          {showPriceForm && (
            <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-white dark:bg-slate-700 rounded-lg">
              <input placeholder="Ürün adı" value={priceForm.product_name} onChange={(e) => setPriceForm({ ...priceForm, product_name: e.target.value })}
                className="col-span-2 px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
              <input placeholder="Birim (KG, ADET)" value={priceForm.unit} onChange={(e) => setPriceForm({ ...priceForm, unit: e.target.value })}
                className="px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
              <input placeholder="Fiyat (TL)" type="number" value={priceForm.price} onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                className="px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
              <input placeholder="Min miktar" type="number" value={priceForm.min_quantity} onChange={(e) => setPriceForm({ ...priceForm, min_quantity: e.target.value })}
                className="px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
              <button onClick={handleAddPrice} className="col-span-2 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-medium hover:bg-sky-700">Kaydet</button>
            </div>
          )}

          <div className="space-y-1">
            {(customerPrices as Record<string, unknown>[]).length === 0 ? (
              <p className="text-xs text-sky-400 italic">Henüz özel fiyat tanımlanmamış. "+ Fiyat Ekle" ile ekleyin.</p>
            ) : (customerPrices as Record<string, unknown>[]).map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{(p as any).product_name}</span>
                  {(p as any).min_quantity > 0 && <span className="text-xs text-sky-500 ml-1">(Min {(p as any).min_quantity} {(p as any).unit})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sky-700 dark:text-sky-300">{Number((p as any).price).toLocaleString('tr-TR')} TL/{(p as any).unit}</span>
                  <button onClick={() => handleDeletePrice((p as any).id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

          {/* AI Insights */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-violet-200 dark:border-violet-800 p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <span className="text-sm">🤖</span>
              </div>
              <span className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide">AI Müşteri Analizi</span>
            </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{insightParts.join(' ')}</p>
        </div>

      </div>

      {/* Customer Journey */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">🗺️ Müşteri Yolculuğu</h3>
        <div className="space-y-2">
          {[
            { step: 'İlk Temas', icon: '👋', time: orders.length > 0 ? new Date(orders[orders.length - 1].created_at as string).toLocaleDateString('tr-TR') : '—', desc: 'Müşteri ilk kez ulaştı' },
            { step: 'İlk Sipariş', icon: '📦', time: orders.length > 0 ? new Date(orders[orders.length - 1].created_at as string).toLocaleDateString('tr-TR') : '—', desc: `İlk siparişini verdi` },
            { step: 'Toplam Sipariş', icon: '📊', time: `${orders.length} sipariş`, desc: `Toplam ${totalSpent.toLocaleString('tr-TR')} TL harcama` },
            { step: 'Son Sipariş', icon: '🕐', time: daysSinceLastOrder > 999 ? '—' : `${daysSinceLastOrder} gün önce`, desc: daysSinceLastOrder > 60 ? 'Yeniden kazanılabilir' : 'Aktif müşteri' },
            { step: 'Segment', icon: segment.icon, time: segment.label, desc: `${avgBasket.toLocaleString('tr-TR')} TL ortalama sepet` },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center text-sm shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.step}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{item.desc}</p>
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-slate-300 shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
        {topProducts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
            <span className="text-xs font-semibold text-gray-500 uppercase">En Çok Alınan Ürünler</span>
            <div className="mt-1 space-y-1">
              {topProducts.map(([name, qty], i) => (
                <div key={i} className="flex justify-between text-sm bg-gray-50 dark:bg-slate-700/50 rounded px-3 py-1.5">
                  <span className="text-gray-700 dark:text-slate-300">{name}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{qty} adet</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📦 Son Siparişler</h3>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Henüz sipariş yok</p>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id as string} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">#{(o as Record<string, string>).order_number}</span>
                  <span className="text-sm text-gray-500 dark:text-slate-400 ml-2">{Number(o.total_price || 0).toLocaleString('tr-TR')} TL</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(o.created_at as string).toLocaleDateString('tr-TR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📋 Aktivite Geçmişi</h3>
        {timeline.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Aktivite bulunmuyor</p>
        ) : (
          <div className="space-y-2">
            {timeline.slice(0, 10).map((entry, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                <div>
                  <p className="text-gray-700 dark:text-slate-300">{entry.description as string}</p>
                  <p className="text-xs text-gray-400">{new Date(entry.created_at as string).toLocaleString('tr-TR')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
