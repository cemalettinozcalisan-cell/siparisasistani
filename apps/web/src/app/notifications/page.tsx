'use client';

import { useEffect, useState } from 'react';

const ICON_MAP: Record<string, string> = {
  new_order: '🆕', payment: '💳', cargo: '🚚', human_request: '👤',
  callback: '📞', warning: '⚠️',
};

const FILTER_TR: Record<string, string> = {
  all: 'Tümü', new_order: 'Sipariş', payment: 'Ödeme', cargo: 'Kargo',
  human_request: 'Yetkili', callback: 'Geri Arama', warning: 'Uyarı',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Record<string, unknown>[]>([]);
  const [filter, setFilter] = useState('all');
  const tid = '00000000-0000-0000-0000-000000000001';

  const load = async () => {
    try {
      const res = await fetch(`/api/notifications-api/${tid}?limit=100`);
      const data = await res.json();
      if (Array.isArray(data)) setNotifications(data);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications-api/${tid}/read/${id}`, { method: 'PUT' });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, status: 'read' } : n));
  };

  const markAllRead = async () => {
    await fetch(`/api/notifications-api/${tid}/read-all`, { method: 'PUT' });
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
  };

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter);
  const unread = notifications.filter((n) => n.status === 'unread').length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bildirimler</h1>
          <p className="text-sm text-gray-500 mt-1">{unread > 0 ? `${unread} okunmamış bildirim` : 'Tüm bildirimler okundu'}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100">
            Tümünü okundu yap
          </button>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {Object.entries(FILTER_TR).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium ${filter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {key === 'all' ? label : `${ICON_MAP[key] || '📋'} ${label}`}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        {filtered.map((n) => (
          <div key={n.id as string}
            className={`flex items-start gap-3 p-4 ${n.status === 'unread' ? 'bg-blue-50/30' : ''} transition-colors`}>
            <span className="text-lg mt-0.5">{ICON_MAP[n.type as string] || '📋'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{n.title as string}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{n.message as string}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {n.status === 'unread' && (
                    <button onClick={() => markRead(n.id as string)}
                      className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100">Okundu</button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(n.created_at as string).toLocaleString('tr-TR')}
                {n.status === 'unread' && <span className="ml-2 w-1.5 h-1.5 inline-block rounded-full bg-blue-500 align-middle" />}
              </p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            <p className="text-3xl mb-2">🔔</p>
            <p className="text-sm">Bildirim bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );
}
