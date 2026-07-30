'use client';

import { useEffect, useState } from 'react';
import { OrderDetail } from '@/components/order-detail';
import { Layers, PhoneCall, MessageCircle, Camera, Globe, Search, ChevronDown } from 'lucide-react';

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ReactNode; activeClass: string; inactiveClass: string }> = {
  PHONE: { label: 'Telefon AI', icon: <PhoneCall className="w-3.5 h-3.5" />, activeClass: 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300', inactiveClass: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700' },
  WHATSAPP: { label: 'WhatsApp', icon: <MessageCircle className="w-3.5 h-3.5" />, activeClass: 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300', inactiveClass: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700' },
  INSTAGRAM: { label: 'Instagram', icon: <Camera className="w-3.5 h-3.5" />, activeClass: 'bg-pink-600 text-white shadow-sm ring-2 ring-pink-300', inactiveClass: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700' },
  WEBSITE: { label: 'Web', icon: <Globe className="w-3.5 h-3.5" />, activeClass: 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-300', inactiveClass: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700' },
};

const STATUS_PILLS = [
  { key: 'all', label: 'Tümü', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  { key: 'new', label: 'Yeni', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300' },
  { key: 'PAYMENT_CONFIRMED', label: 'Ödeme', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300' },
  { key: 'PACKAGING', label: 'Paket', color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300' },
  { key: 'SHIPPED', label: 'Kargo', color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300' },
  { key: 'DELIVERED', label: 'Teslim', color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300' },
  { key: 'CANCELLED', label: 'İptal', color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300' },
];

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  new: { label: 'Yeni', color: 'bg-blue-100 text-blue-700' },
  PAYMENT_CONFIRMED: { label: 'Ödeme Onaylandı', color: 'bg-emerald-100 text-emerald-700' },
  PACKAGING: { label: 'Paketleniyor', color: 'bg-amber-100 text-amber-700' },
  PACKAGED: { label: 'Paketlendi', color: 'bg-indigo-100 text-indigo-700' },
  SHIPPED: { label: 'Kargoda', color: 'bg-purple-100 text-purple-700' },
  DELIVERED: { label: 'Teslim Edildi', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'İptal', color: 'bg-red-100 text-red-700' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [timeline, setTimeline] = useState<Record<string, unknown>[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, unknown>[]>([]);
  const tid = '00000000-0000-0000-0000-000000000001';
  const sourceList = ['all', 'PHONE', 'WHATSAPP', 'INSTAGRAM', 'WEBSITE'];

  const loadOrders = () => {
    const params = new URLSearchParams();
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    fetch(`/api/orders-list/${tid}?${params}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setOrders(d); }).catch(() => {});
  };
  useEffect(() => { loadOrders(); }, [sourceFilter]);

  const loadDetail = async (order: Record<string, unknown>) => {
    setSelected(order);
    const [tlRes, itemsRes] = await Promise.all([
      fetch(`/api/timeline/order/${tid}/${order.id}`),
      fetch(`/api/order-items/${order.id}`).catch(() => ({ json: () => [] })),
    ]);
    setTimeline(await tlRes.json());
    const items = await itemsRes.json();
    setOrderItems(Array.isArray(items) ? items : []);
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    await fetch('/api/orders/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId: tid, orderId, status: newStatus }) });
    setSelected({ ...selected!, status: newStatus });
    const tl = await fetch(`/api/timeline/order/${tid}/${orderId}`);
    setTimeline(await tl.json());
    loadOrders();
  };

  const filtered = (Array.isArray(orders) ? orders : []).filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search && !String(o.customer_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 flex flex-col lg:flex-row gap-4 h-auto lg:h-[calc(100vh-2rem)]">
      {/* Left Panel */}
      <div className="w-full lg:w-2/5 flex flex-col space-y-3">
        {/* Header + Search */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white shrink-0">Tüm Siparişler</h1>
          <div className="flex items-center gap-2">
            <a href="/live" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm shrink-0">Canlı Siparişler Git</a>
            <div className="relative flex-1 max-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ara..." className="w-full pl-8 pr-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>
        </div>

        {/* Source Tabs + Status Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button key="all" onClick={() => setSourceFilter('all')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${sourceFilter === 'all' ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
            <Layers className="w-3.5 h-3.5" /> Tümü
          </button>
          {sourceList.filter(s => s !== 'all').map(s => {
            const cfg = SOURCE_CONFIG[s];
            return (
              <button key={s} onClick={() => setSourceFilter(s)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${sourceFilter === s ? cfg.activeClass : cfg.inactiveClass}`}>
                {cfg.icon} {cfg.label}
              </button>
            );
          })}
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
          {STATUS_PILLS.map(p => (
            <button key={p.key} onClick={() => setStatusFilter(p.key)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${statusFilter === p.key ? `${p.color} ring-2 ring-slate-400/30` : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {filtered.length > 0 ? filtered.map((o) => {
            const badge = STATUS_BADGE[o.status as string] || { label: o.status as string, color: 'bg-slate-100 text-slate-600' };
            const source = (o.source as string) || 'PHONE';
            const sc = SOURCE_CONFIG[source];
            return (
              <div key={o.id as string} onClick={() => loadDetail(o)}
                className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group ${selected?.id === o.id ? 'ring-2 ring-indigo-400 border-indigo-300 shadow-md' : ''}`}>
                {/* Top row: order no + channel + status badge */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">#{(o as Record<string, string>).order_number}</span>
                    {source !== 'PHONE' && <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300`}>{sc?.icon} {sc?.label}</span>}
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.color}`}>{badge.label}</span>
                </div>
                {/* Bottom row: customer name + total + actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{o.customer_name as string || 'Bilinmiyor'}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white shrink-0">{Number(o.total_price || 0).toLocaleString('tr-TR')} TL</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <button onClick={(e) => { e.stopPropagation(); window.open(`tel:${o.customer_phone}`, '_blank'); }}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 hover:bg-blue-100 dark:hover:bg-blue-800 transition-all text-[10px]">📞</button>
                    <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${o.customer_phone}`, '_blank'); }}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition-all text-[10px]">💬</button>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
                <span className="text-xl">📦</span>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Henüz sipariş yok</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-3/5">
        {selected ? (
          <OrderDetail order={selected} items={orderItems} timeline={timeline} onStatusChange={updateStatus} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-xs">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <Layers className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Detaylarını incelemek için soldan bir sipariş seçin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
