'use client';

import { useEffect, useState } from 'react';

export default function LiveOrdersPage() {
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`/api/orders-list/${tid}?status=new`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const newOrders = data.filter((o: Record<string, unknown>) => !orders.find((x) => x.id === o.id));
          if (newOrders.length > 0) {
            setFlash(newOrders[0].order_number as string);
            setTimeout(() => setFlash(null), 5000);
          }
          setOrders(data);
        }
      } catch {}
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Canli Siparisler</h1>
          <p className="text-sm text-gray-500">{orders.length} yeni siparis bekliyor</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-gray-400">Canli</span>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">📦</p>
          <p className="text-lg">Henuz yeni siparis yok</p>
          <p className="text-sm mt-1">Her 10 saniyede bir kontrol ediliyor</p>
        </div>
      )}

      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id as string} className={`rounded-xl border-2 p-4 transition-all duration-500 ${flash === order.order_number ? 'border-green-400 bg-green-50 shadow-lg scale-[1.02]' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🔔</span>
                  <span className="font-bold text-gray-900">{order.customer_name as string || 'Bilinmiyor'}</span>
                  <span className="text-sm text-gray-500">#{(order as Record<string, string>).order_number}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${order.channel === 'phone' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {order.channel === 'phone' ? '📞 Telefon' : '💬 WhatsApp'}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <span className="font-bold text-gray-900">{Number(order.total_price || 0).toLocaleString('tr-TR')} TL</span>
                  <span className="text-xs text-gray-400">{new Date(order.created_at as string).toLocaleTimeString('tr-TR')}</span>
                </div>
              </div>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">🆕 YENI</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
