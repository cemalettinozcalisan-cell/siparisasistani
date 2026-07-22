'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [recent, setRecent] = useState<Record<string, unknown>[]>([]);
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    Promise.all([
      fetch(`/api/dashboard/${tid}`).then(r => r.json()),
      fetch(`/api/timeline/recent/${tid}`).then(r => r.json()),
      fetch(`/api/health/${tid}`).then(r => r.json()).catch(() => ({})),
    ]).then(([d, tl, h]) => {
      setStats({ ...d, ...h });
      setRecent(tl);
    }).catch(() => {});
  }, []);

  const today = stats.today as Record<string, unknown> || {};
  const totalOrders = (stats.todayOrders as number) || 0;
  const todayRevenue = Number(stats.todayRevenue || 0);
  const aiSuccessRate = (today.aiSuccessRate as number) || 0;
  const shippedCount = ((stats.orderStats as Record<string, number>)?.shipped) || 0;

  const kpiCards = [
    { label: 'Bugunku Siparis', value: totalOrders, icon: '🛒', color: 'from-blue-500 to-blue-600', sub: 'Adet' },
    { label: 'Bugunku Ciro', value: `${todayRevenue.toLocaleString('tr-TR')} TL`, icon: '💰', color: 'from-emerald-500 to-emerald-600', sub: 'Toplam satis' },
    { label: 'Bekleyen Odeme', value: (stats.pendingOrders as number) || 0, icon: '⏳', color: 'from-amber-500 to-amber-600', sub: 'Onay bekliyor' },
    { label: 'AI Basari', value: `%${aiSuccessRate || 0}`, icon: '🤖', color: 'from-violet-500 to-violet-600', sub: 'Basari orani' },
    { label: 'Paketlenecek', value: ((stats.orderStats as Record<string, number>)?.preparing) || 0, icon: '📦', color: 'from-indigo-500 to-indigo-600', sub: 'Hazirlaniyor' },
    { label: 'Kargoda', value: shippedCount, icon: '🚚', color: 'from-purple-500 to-purple-600', sub: 'Yolda' },
    { label: 'Tamamlanan', value: ((stats.orderStats as Record<string, number>)?.completed) || 0, icon: '✅', color: 'from-green-500 to-green-600', sub: 'Teslim edildi' },
    { label: 'Toplam Musteri', value: (stats.totalCustomers as number) || 0, icon: '👥', color: 'from-cyan-500 to-cyan-600', sub: 'Kayitli musteri' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Isletme ozeti</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="text-xs text-gray-400">{new Date().toLocaleDateString('tr-TR', { weekday: 'long' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className={`rounded-xl p-4 bg-gradient-to-br ${card.color} text-white shadow-sm`}>
            <div className="flex items-center justify-between">
              <span className="text-2xl">{card.icon}</span>
              <span className="text-xs opacity-70">{card.sub}</span>
            </div>
            <div className="text-2xl font-bold mt-2">{String(card.value)}</div>
            <div className="text-xs mt-1 opacity-90">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">🔔 Son Aktiviteler</h2>
            <span className="text-xs text-gray-400">{recent.length} kayit</span>
          </div>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {recent.slice(0, 15).map((entry: Record<string, unknown>, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-base mt-0.5">{entry.event_icon as string || '📋'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700 text-xs truncate">{entry.description as string}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(entry.created_at as string).toLocaleString('tr-TR')}
                    <span className="ml-1.5">{entry.actor_type as string}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">📊 Hizli Gorunum</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <span className="text-sm text-gray-600">📞 Bugunku Arama</span>
              <span className="font-bold">{String(today.totalCalls || totalOrders)}</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <span className="text-sm text-gray-600">📊 Siparise Donusum</span>
              <span className="font-bold text-green-600">%{aiSuccessRate || 0}</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <span className="text-sm text-gray-600">⏱ Ort. Konusma</span>
              <span className="font-bold">{today.avgCallDuration || 0} dk</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <span className="text-sm text-gray-600">🤖 Ort. Guven</span>
              <span className="font-bold">%{today.avgConfidence || 0}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <a href="/orders" className="p-2.5 bg-blue-50 rounded-lg text-center text-xs text-blue-700 hover:bg-blue-100 font-medium">📋 Tum Siparisler</a>
              <a href="/complaints" className="p-2.5 bg-red-50 rounded-lg text-center text-xs text-red-700 hover:bg-red-100 font-medium">⚠️ Sikayetler</a>
              <a href="/customers" className="p-2.5 bg-green-50 rounded-lg text-center text-xs text-green-700 hover:bg-green-100 font-medium">👥 Musteriler</a>
              <a href="/settings" className="p-2.5 bg-gray-50 rounded-lg text-center text-xs text-gray-700 hover:bg-gray-100 font-medium">⚙️ Ayarlar</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
