'use client';

import { useState } from 'react';

export default function ReplayPage() {
  const [orderId, setOrderId] = useState('');
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const [replayRes, convRes] = await Promise.all([
        fetch(`/api/replay/order/${orderId}`),
        fetch(`/api/replay/conversation/${orderId}`),
      ]);
      const replay = await replayRes.json();
      const conv = await convRes.json();
      setData({ ...replay, ...conv });
    } catch { setData({ error: 'Yuklenemedi' }); }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Conversation Replay</h1>
      <p className="text-sm text-gray-500 dark:text-slate-400">Siparis ID ile konusmayi bastan sona izle</p>

      <div className="flex gap-2">
        <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Siparis ID girin..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <button onClick={load} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{loading ? 'Yukleniyor...' : 'Izle'}</button>
      </div>
    </div>
  );
}
