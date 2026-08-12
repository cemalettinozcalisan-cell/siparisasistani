'use client';

import { getTenantId } from '@/lib/tenant';

import { useEffect, useState } from 'react';
import { OrderDetail } from '@/components/order-detail';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [timeline, setTimeline] = useState<Record<string, unknown>[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, unknown>[]>([]);
  const tid = getTenantId();

  const statusConfig: Record<string, { label: string; icon: string; color: string }> = {
    new: { label: 'Yeni', icon: '🆕', color: 'border-l-yellow-400 bg-yellow-50' },
    PAYMENT_WAITING: { label: 'Ödeme Bekliyor', icon: '💳', color: 'border-l-orange-400 bg-orange-50' },
    PAYMENT_CONFIRMED: { label: 'Ödeme Onaylandı', icon: '✅', color: 'border-l-green-400 bg-green-50' },
    PACKAGING: { label: 'Paketleniyor', icon: '📦', color: 'border-l-indigo-400 bg-indigo-50' },
    PACKAGED: { label: 'Paketlendi', icon: '📦', color: 'border-l-indigo-400 bg-indigo-50' },
    SHIPPED: { label: 'Kargoda', icon: '🚚', color: 'border-l-purple-400 bg-purple-50' },
    DELIVERED: { label: 'Teslim Edildi', icon: '✅', color: 'border-l-green-400 bg-green-50' },
    CANCELLED: { label: 'İptal', icon: '❌', color: 'border-l-red-400 bg-red-50' },
  };

  const statusList = ['all', 'new', 'PAYMENT_CONFIRMED', 'PACKAGING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  const loadOrders = () => {
    fetch(`/api/orders-list/${tid}`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setOrders(d);
    }).catch(() => {});
  };

  useEffect(() => { loadOrders(); }, []);

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
    await fetch('/api/orders/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: tid, orderId, status: newStatus }),
    });
    setSelected({ ...selected!, status: newStatus });
    const tl = await fetch(`/api/timeline/order/${tid}/${orderId}`);
    setTimeline(await tl.json());
    loadOrders();
  };

  const orderList = Array.isArray(orders) ? orders : [];
  const filtered = orderList.filter((o: Record<string, unknown>) => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (search && !String(o.customer_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 flex gap-4 h-[calc(100vh-2rem)]">
      <div className="w-2/5 flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Siparişler</h1>
          <input placeholder="Müşteri ara..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-44" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {statusList.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s === 'all' ? 'Tümü' : `${statusConfig[s]?.icon || ''} ${statusConfig[s]?.label || s}`}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {filtered.map((o) => {
            const sc = statusConfig[o.status as string] || { icon: 'ğı“‹', color: 'border-l-gray-300', label: o.status as string };
            return (
              <div key={o.id as string} onClick={() => loadDetail(o)}
                className={`border-l-4 ${sc.color} bg-white rounded-r-lg p-3 cursor-pointer hover:shadow-md transition-all ${selected?.id === o.id ? 'ring-2 ring-blue-400 shadow-md' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{sc.icon}</span>
                    <span className="font-semibold text-sm">#{o.order_number as string}</span>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${o.channel === 'phone' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {o.channel === 'phone' ? 'ğı“' : 'ğı’¬'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className="font-medium">{o.customer_name as string || 'Bilinmiyor'}</span>
                  <span>{Number(o.total_price || 0).toLocaleString('tr-TR')} TL</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-3/5">
        {selected ? (
          <OrderDetail order={selected} items={orderItems} timeline={timeline} onStatusChange={updateStatus} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-4xl mb-2">ğı“‹</p>
              <p className="text-sm">Detayını gı¶rmek için bir sipariş seçin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
