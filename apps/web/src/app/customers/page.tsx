'use client';

import { useEffect, useState } from 'react';
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

  const selectCustomer = async (c: Record<string, unknown>) => {
    setSelected(c);
    const phone = c.phone as string || '';

    const [tlRes, ordRes] = await Promise.all([
      fetch(`/api/timeline/customer/${tid}/${c.id}`),
      fetch(`/api/orders-list/${tid}?limit=50`),
    ]);

    const tl = await tlRes.json();
    setTimeline(Array.isArray(tl) ? tl : []);

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

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (c.name as string || '').toLowerCase().includes(q) || (c.phone as string || '').includes(q);
  });

  return (
    <div className="p-4 flex gap-4 h-[calc(100vh-2rem)]">
      <div className="w-1/3 flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Musteriler</h1>
          <input placeholder="Isim/telefon ara..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-40" />
        </div>
        <div className="text-xs text-gray-400">{filtered.length} musteri</div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {filtered.map((c) => (
            <div key={c.id as string} onClick={() => selectCustomer(c)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${selected?.id === c.id ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{c.name as string || 'Isimsiz'}</span>
                <span className="text-xs text-gray-400">{c.phone as string}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>📦 {Number((c as Record<string, unknown>).order_count || 0)} siparis</span>
                {c.city && <span>📍 {c.city as string}</span>}
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
              <p className="text-sm">Detayi gormek icin bir musteri secin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
