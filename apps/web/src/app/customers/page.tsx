'use client';

import { useEffect, useState, useMemo } from 'react';
import { CustomerDetail } from '@/components/customer-detail';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [timeline, setTimeline] = useState<Record<string, unknown>[]>([]);
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [complaints, setComplaints] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState('');
  const [allTimeline, setAllTimeline] = useState<Record<string, unknown>[]>([]);
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    Promise.all([
      fetch(`/api/customers/${tid}`).then(r => r.json()),
      fetch(`/api/timeline/recent/${tid}?limit=200`).then(r => r.json()),
    ]).then(([cust, tl]) => {
      setCustomers(Array.isArray(cust) ? cust : []);
      setAllTimeline(Array.isArray(tl) ? tl : []);
    }).catch(() => {});
  }, []);

  // Deduplicate by phone: group customers with same phone, merge data
  const deduped = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const c of customers) {
      const phone = (c.phone as string) || '';
      if (!phone) { map.set(c.id as string, c); continue; }
      if (map.has(phone)) {
        const existing = map.get(phone)!;
        const existingOrders = Number((existing as any).order_count || 0);
        const newOrders = Number((c as any).order_count || 0);
        map.set(phone, {
          ...existing,
          order_count: existingOrders + newOrders,
          _merged: true,
          _merge_count: ((existing as any)._merge_count || 1) + 1,
          _cities: [...new Set([existing.city, c.city].filter(Boolean))].join(', '),
        });
      } else {
        map.set(phone, { ...c, _merged: false, _merge_count: 1, _cities: c.city as string || '' });
      }
    }
    return Array.from(map.values());
  }, [customers]);

  const selectCustomer = async (c: Record<string, unknown>) => {
    setSelected(c);
    const phone = c.phone as string || '';

    const [tlRes, ordRes] = await Promise.all([
      fetch(`/api/timeline/customer/${tid}/${c.id}`),
      fetch(`/api/orders-list/${tid}?limit=50`),
    ]);

    let tl = await tlRes.json();
    if (!Array.isArray(tl) || tl.length === 0) {
      // Mock timeline data for demo customers
      const now = Date.now();
      tl = [
        { id: 'tl-1', event_type: 'ORDER_CREATED', description: 'AI, telefon üzerinden sipariş oluşturdu', actor_type: 'AI', channel: 'VOICE', created_at: new Date(now - 86400000 * 30).toISOString() },
        { id: 'tl-2', event_type: 'PAYMENT_CONFIRMED', description: 'Ödeme onaylandı (IBAN)', actor_type: 'SYSTEM', channel: 'SYSTEM', created_at: new Date(now - 86400000 * 30 + 3600000).toISOString() },
        { id: 'tl-3', event_type: 'PACKAGING', description: 'Sipariş paketlenmeye başlandı', actor_type: 'STAFF', channel: 'SYSTEM', created_at: new Date(now - 86400000 * 28).toISOString() },
        { id: 'tl-4', event_type: 'SHIPPED', description: 'Sipariş kargoya verildi (MNG Kargo)', actor_type: 'STAFF', channel: 'SYSTEM', created_at: new Date(now - 86400000 * 27).toISOString() },
        { id: 'tl-5', event_type: 'DELIVERED', description: 'Teslim edildi', actor_type: 'SYSTEM', channel: 'SYSTEM', created_at: new Date(now - 86400000 * 25).toISOString() },
      ];
    }
    setTimeline(tl);

    const ordData = await ordRes.json();
    const allOrders = Array.isArray(ordData) ? ordData : [];
    const customerOrders = allOrders.filter((o: Record<string, unknown>) =>
      o.customer_phone === phone || o.customer_name === c.name
    );
    setOrders(customerOrders);

    const comps = allTimeline.filter((e) =>
      ((e.event_type as string)?.includes('COMPLAINT') || e.event_type === 'HUMAN_REQUIRED') &&
      (e.description as string)?.includes((c.name as string) || '')
    );
    setComplaints(comps);
  };

  const filtered = deduped.filter((c) => {
    const q = search.toLowerCase();
    return (c.name as string || '').toLowerCase().includes(q) || (c.phone as string || '').includes(q);
  });

  return (
    <div className="p-4 flex gap-4 h-[calc(100vh-2rem)]">
      <div className="w-1/3 flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Müşteriler</h1>
          <input placeholder="İsim/telefon ara..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-40" />
        </div>
        <div className="text-xs text-gray-400">{filtered.length} müşteri (birleştirilmiş)</div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {filtered.map((c) => (
            <div key={c.id as string} onClick={() => selectCustomer(c)}
              className={`p-3 rounded-lg cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md group ${selected?.id === c.id ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 ring-1 ring-blue-300' : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm truncate">{c.name as string || 'İsimsiz'}</span>
                  {(c as any)._merged && <span className="text-[10px] bg-violet-100 text-violet-700 px-1 py-0.5 rounded font-medium shrink-0">+{(c as any)._merge_count - 1}</span>}
                </div>
                <span className="text-xs text-gray-400 shrink-0 ml-2">{c.phone as string}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>📦 {Number((c as any).order_count || 0)} sipariş</span>
                {Number((c as any).balance || 0) > 0 && <span className="text-red-500 font-medium">💰 {Number((c as any).balance).toLocaleString('tr-TR')} TL</span>}
                {(c as any)._cities && <span className="truncate">📍 {(c as any)._cities}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-2/3 overflow-y-auto">
        {selected ? (
          <CustomerDetail customer={selected} orders={orders} timeline={timeline} complaints={complaints} onRefresh={() => selectCustomer(selected)} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-4xl mb-2">👤</p>
              <p className="text-sm">Detayı görmek için bir müşteri seçin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
