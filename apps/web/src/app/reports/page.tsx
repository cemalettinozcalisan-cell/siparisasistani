'use client';

import { useEffect, useState } from 'react';

export default function ReportsPage() {
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [recentOrders, setRecentOrders] = useState<Record<string, unknown>[]>([]);
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    Promise.all([
      fetch(`/api/dashboard/${tid}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/health/${tid}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/orders-list/${tid}?limit=500`).then(r => r.json()).catch(() => []),
    ]).then(([d, h, orders]) => {
      setStats({ ...d, ...h });
      if (Array.isArray(orders)) setRecentOrders(orders);
    });
  }, []);

  const today = stats.today as Record<string, unknown> || {};
  const channelCounts: Record<string, number> = { phone: 0, whatsapp: 0 };
  const statusCounts: Record<string, number> = {};
  recentOrders.forEach((o: Record<string, unknown>) => {
    const ch = (o.channel as string) || 'phone';
    if (ch === 'phone' || ch === 'whatsapp') channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    const st = (o.status as string) || 'unknown';
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  });
  const totalRevenue = recentOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">📊 Raporlar</h1>
      <p className="text-sm text-gray-500">Isletme performansi</p>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Siparis', value: recentOrders.length, icon: '📦', color: 'from-blue-500 to-blue-600' },
          { label: 'Toplam Ciro', value: `${totalRevenue.toLocaleString('tr-TR')} TL`, icon: '💰', color: 'from-emerald-500 to-emerald-600' },
          { label: 'AI Basari', value: `%${String(today.aiSuccessRate || 0)}`, icon: '🤖', color: 'from-amber-500 to-amber-600' },
          { label: 'Toplam Konusma', value: String(today.totalCalls || stats.todayOrders || 0), icon: '📞', color: 'from-purple-500 to-purple-600' },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl p-4 bg-gradient-to-br ${c.color} text-white`}>
            <div className="text-xl">{c.icon}</div>
            <div className="text-xl font-bold mt-1">{String(c.value)}</div>
            <div className="text-xs opacity-90">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">📊 Kanal Dagilimi</h2>
          <div className="space-y-3">
            {[{ icon: '📞', label: 'Telefon', count: channelCounts.phone, color: 'bg-blue-500' },
              { icon: '💬', label: 'WhatsApp', count: channelCounts.whatsapp, color: 'bg-green-500' }
            ].map((c) => (
              <div key={c.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{c.icon} {c.label}</span>
                  <span className="font-medium">{c.count} siparis</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`${c.color} h-2 rounded-full`} style={{ width: `${recentOrders.length > 0 ? (c.count / recentOrders.length) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">📋 Siparis Durumlari</h2>
          <div className="space-y-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex justify-between text-sm">
                <span className="text-gray-600">{status}</span>
                <span className="font-medium">{count} siparis</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">📋 Son Siparisler</h2>
          <div className="flex gap-2">
            <a href={`/api/export/orders/${tid}`} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100">📥 CSV</a>
            <a href={`/api/export/customers/${tid}`} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100">👥 Musteri CSV</a>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 pr-4">Siparis</th>
                <th className="pb-2 pr-4">Musteri</th>
                <th className="pb-2 pr-4">Tutar</th>
                <th className="pb-2 pr-4">Kanal</th>
                <th className="pb-2 pr-4">Durum</th>
                <th className="pb-2">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.slice(0, 20).map((o) => (
                <tr key={o.id as string} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium">#{(o as Record<string, string>).order_number}</td>
                  <td className="py-2 pr-4">{o.customer_name as string || '-'}</td>
                  <td className="py-2 pr-4">{Number(o.total_price || 0).toLocaleString('tr-TR')} TL</td>
                  <td className="py-2 pr-4">{o.channel === 'phone' ? '📞' : '💬'}</td>
                  <td className="py-2 pr-4">{o.status as string}</td>
                  <td className="py-2">{new Date(o.created_at as string).toLocaleDateString('tr-TR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
