'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, ChevronRight, PhoneCall, MessageCircle, Printer, CheckCheck, Clock, Volume2, VolumeX, LayoutGrid, List, Package, Truck } from 'lucide-react';

const MOCK_ORDERS: Record<string, unknown>[] = [
  { id: 'm1', order_number: '26-00006', total_price: 2980, status: 'new', channel: 'phone', source: 'PHONE', created_at: new Date(Date.now() - 120000).toISOString(), customer_name: 'Mehmet Öztürk', customer_phone: '05339876543' },
  { id: 'm2', order_number: '26-00007', total_price: 1840, status: 'new', channel: 'whatsapp', source: 'WHATSAPP', created_at: new Date(Date.now() - 300000).toISOString(), customer_name: 'Ali Kaya', customer_phone: '05411223344' },
  { id: 'm3', order_number: '26-00008', total_price: 4500, status: 'new', channel: 'phone', source: 'PHONE', created_at: new Date(Date.now() - 600000).toISOString(), customer_name: 'Fatma Şahin', customer_phone: '05449876543' },
  { id: 'm4', order_number: '26-00004', total_price: 3200, status: 'PAYMENT_CONFIRMED', channel: 'phone', source: 'PHONE', created_at: new Date(Date.now() - 3600000).toISOString(), customer_name: 'Mustafa Öztürk', customer_phone: '05551234567' },
  { id: 'm5', order_number: '26-00005', total_price: 2500, status: 'PAYMENT_CONFIRMED', channel: 'whatsapp', source: 'WHATSAPP', created_at: new Date(Date.now() - 7200000).toISOString(), customer_name: 'Hatice Çelik', customer_phone: '05328765432' },
  { id: 'm6', order_number: '26-00003', total_price: 15600, status: 'PACKAGING', channel: 'whatsapp', source: 'WHOLESALE', created_at: new Date(Date.now() - 14400000).toISOString(), customer_name: 'Hatice Çelik', customer_phone: '05328765432' },
];

function TimerBadge({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(createdAt).getTime();
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      if (mins < 1) setElapsed(`${secs}sn`);
      else if (mins < 60) setElapsed(`${mins}dk ${secs}sn`);
      else setElapsed(`${Math.floor(mins / 60)}s ${mins % 60}dk`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);
  return <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">⏱ {elapsed}</span>;
}

export default function LiveOrdersPage() {
  const [allOrders, setAllOrders] = useState<Record<string, unknown>[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const tid = '00000000-0000-0000-0000-000000000001';

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders-list/${tid}?status=new,PAYMENT_CONFIRMED,PACKAGING,PACKAGED&limit=50`);
      const data = await res.json();
      let list = Array.isArray(data) && data.length > 0 ? data : MOCK_ORDERS;
      const newOrderIds = list.map((o: Record<string, unknown>) => o.id);
      const existingIds = allOrders.map((o) => o.id);
      const hasNew = list.some((o: Record<string, unknown>) => !existingIds.includes(o.id));
      if (hasNew) {
        const newest = list.find((o: Record<string, unknown>) => !existingIds.includes(o.id));
        if (newest) setFlash(newest.order_number as string);
        if (soundEnabled) {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.type = 'sine'; o.frequency.setValueAtTime(880, ctx.currentTime);
            g.gain.setValueAtTime(0.1, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.3);
          } catch {}
        }
        setTimeout(() => setFlash(null), 4000);
      }
      setAllOrders(list);
    } catch { setAllOrders(MOCK_ORDERS); }
  }, [soundEnabled]);

  useEffect(() => { fetchOrders(); const interval = setInterval(fetchOrders, 10000); return () => clearInterval(interval); }, [fetchOrders]);

  const handleApprove = async (order: Record<string, unknown>) => {
    await fetch('/api/orders/status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: tid, orderId: order.id, status: 'PAYMENT_CONFIRMED' }),
    }).catch(() => {});
    setAllOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'PAYMENT_CONFIRMED' } : o));
  };

  const handleNextStatus = async (order: Record<string, unknown>, nextStatus: string) => {
    await fetch('/api/orders/status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: tid, orderId: order.id, status: nextStatus }),
    }).catch(() => {});
    setAllOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: nextStatus } : o));
  };

  const handlePrint = (order: Record<string, unknown>) => {
    window.open(`/api/print/render/${tid}/${order.id}`, '_blank');
  };

  const newOrders = allOrders.filter(o => o.status === 'new');
  const preparingOrders = allOrders.filter(o => o.status === 'PAYMENT_CONFIRMED');
  const readyOrders = allOrders.filter(o => o.status === 'PACKAGING' || o.status === 'PACKAGED');

  const renderCard = (order: Record<string, unknown>, column: string) => {
    const isPhone = order.channel === 'phone';
    const isNew = column === 'new';
    const isPreparing = column === 'preparing';

    return (
      <div key={order.id as string}
        className={`bg-white dark:bg-slate-800 rounded-xl border-2 p-4 shadow-sm transition-all duration-300 flex flex-col ${
          flash === order.order_number
            ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20 shadow-lg scale-[1.02] animate-pulse'
            : isNew ? 'border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700'
        }`}>
        <div className="flex items-center justify-between mb-2">
          <TimerBadge createdAt={order.created_at as string} />
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
            isPhone
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800'
              : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
          }`}>
            {isPhone ? <PhoneCall className="w-3 h-3" /> : <MessageCircle className="w-3 h-3" />}
            {isPhone ? 'Telefon' : 'WhatsApp'}
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white">{order.customer_name as string || 'Bilinmiyor'}</h3>
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          <span>#{(order as Record<string, string>).order_number}</span>
        </div>

        <div className="mt-2 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <span>{Number(order.total_price || 0).toLocaleString('tr-TR')} TL tutarında sipariş</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <span className="text-lg font-bold text-slate-900 dark:text-white">
            {Number(order.total_price || 0).toLocaleString('tr-TR')} TL
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => handlePrint(order)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <Printer className="w-3.5 h-3.5" /> Fiş
            </button>
            {isNew && (
              <button onClick={() => handleApprove(order)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm">
                <CheckCheck className="w-3.5 h-3.5" /> Onayla
              </button>
            )}
            {isPreparing && (
              <button onClick={() => handleNextStatus(order, 'PACKAGING')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm">
                <Package className="w-3.5 h-3.5" /> Paketle
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const columnData = [
    { key: 'new', label: 'Yeni Gelenler', icon: '🔔', color: 'bg-emerald-500', orders: newOrders, emptyText: 'Tüm siparişler hazırlanıyor' },
    { key: 'preparing', label: 'Hazırlanıyor', icon: '👨‍🍳', color: 'bg-amber-500', orders: preparingOrders, emptyText: 'Onay bekleyen sipariş yok' },
    { key: 'ready', label: 'Hazır / Kuryede', icon: '🚚', color: 'bg-blue-500', orders: readyOrders, emptyText: 'Paketlenen sipariş buraya gelir' },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Canlı Siparişler</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{newOrders.length} yeni sipariş bekliyor</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-full">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Canlı - Anlık Güncelleniyor</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg transition-colors ${soundEnabled ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
            <button onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-400'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-400'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Flow Summary */}
      {allOrders.length > 0 && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg font-medium text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Yeni <span className="font-bold">{newOrders.length}</span>
            </span>
            <span className="text-slate-300">→</span>
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg font-medium text-amber-700 dark:text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Hazırlanıyor <span className="font-bold">{preparingOrders.length}</span>
            </span>
            <span className="text-slate-300">→</span>
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg font-medium text-blue-700 dark:text-blue-300">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Kuryede <span className="font-bold">{readyOrders.length}</span>
            </span>
          </div>
          <a href="/orders"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm">
            📦 Tüm Siparişleri Gör →
          </a>
        </div>
      )}

      {allOrders.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-sm text-slate-500 dark:text-slate-300">Tüm siparişler hazırlandı</p>
          <p className="text-xs text-slate-400 mt-1">Yeni sipariş geldiğinde burada görünecek</p>
        </div>
      )}

      {viewMode === 'kanban' && allOrders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columnData.map(col => (
            <div key={col.key} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${col.color}`} /> {col.icon} {col.label}
                </h2>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">{col.orders.length}</span>
              </div>
              {col.orders.length > 0 ? col.orders.map(o => renderCard(o, col.key)) : (
                <div className="flex items-center justify-center py-8 text-xs text-slate-400">
                  <p>{col.emptyText}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {viewMode === 'list' && allOrders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {allOrders.map(o => renderCard(o, 'new'))}
        </div>
      )}
    </div>
  );
}
