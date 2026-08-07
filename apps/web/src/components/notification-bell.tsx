'use client';

import { getTenantId } from '@/lib/tenant';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const ICON_MAP: Record<string, string> = {
  new_order: '🆕', payment: '💳', cargo: '🚚', human_request: '👤',
  callback: '📞', warning: '⚠️',
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Record<string, unknown>[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const tid = getTenantId();

  useEffect(() => {
    const load = async () => {
      try {
        const [listRes, countRes] = await Promise.all([
          fetch(`/api/notifications-api/${tid}?limit=10`),
          fetch(`/api/notifications-api/${tid}/unread-count`),
        ]);
        if (listRes.ok) { const list = await listRes.json(); if (Array.isArray(list)) setNotifications(list); }
        if (countRes.ok) { const count = await countRes.json(); setUnreadCount(count.count || 0); }
      } catch {}
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications-api/${tid}/read/${id}`, { method: 'PUT' });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, status: 'read' } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch(`/api/notifications-api/${tid}/read-all`, { method: 'PUT' });
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
    setUnreadCount(0);
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-lg group">
        <span className="inline-block group-hover:animate-[wiggle_0.4s_ease-in-out]">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-sm">Bildirimler</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-800">Tumunu okundu yap</button>
              )}
              <button onClick={() => { router.push('/notifications'); setOpen(false); }} className="text-xs text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:text-slate-300">Tumunu gor</button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                <p className="text-2xl mb-1">🔔</p>
                <p>Bildirim yok</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id as string}
                  className={`flex items-start gap-2 px-4 py-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${n.status === 'unread' ? 'bg-blue-50/50' : ''}`}
                  onClick={() => { if (n.status === 'unread') markRead(n.id as string); setOpen(false); }}>
                  <span className="text-base mt-0.5">{ICON_MAP[n.type as string] || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white dark:text-white">{n.title as string}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 dark:text-slate-400 truncate">{n.message as string}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(n.created_at as string).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {n.status === 'unread' && <span className="ml-1.5 w-1.5 h-1.5 inline-block rounded-full bg-blue-500 align-middle" />}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
