'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, CreditCard, ShoppingBag, Truck, UserCheck, PhoneCall, AlertTriangle, ChevronRight, Clock, Layers } from 'lucide-react';

const NOTIF_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string; text: string }> = {
  new_order: { label: 'Sipariş', icon: ShoppingBag, color: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-100 dark:border-blue-800', text: 'text-blue-600 dark:text-blue-400' },
  payment: { label: 'Ödeme', icon: CreditCard, color: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-100 dark:border-emerald-800', text: 'text-emerald-600 dark:text-emerald-400' },
  cargo: { label: 'Kargo', icon: Truck, color: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-100 dark:border-amber-800', text: 'text-amber-600 dark:text-amber-400' },
  human_request: { label: 'Yetkili', icon: UserCheck, color: 'bg-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/30', border: 'border-violet-100 dark:border-violet-800', text: 'text-violet-600 dark:text-violet-400' },
  callback: { label: 'Geri Arama', icon: PhoneCall, color: 'bg-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-100 dark:border-indigo-800', text: 'text-indigo-600 dark:text-indigo-400' },
  warning: { label: 'Uyarı', icon: AlertTriangle, color: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-100 dark:border-red-800', text: 'text-red-600 dark:text-red-400' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Record<string, unknown>[]>([]);
  const [filter, setFilter] = useState('all');
  const tid = '00000000-0000-0000-0000-000000000001';

  const load = async () => {
    try {
      const res = await fetch(`/api/notifications-api/${tid}?limit=100`);
      const data = await res.json();
      if (Array.isArray(data)) {
        if (data.length === 0) setNotifications(getMockNotifications());
        else setNotifications(data);
      }
    } catch { setNotifications(getMockNotifications()); }
  };
  useEffect(() => { load(); }, []);

  const getMockNotifications = () => [
    { id: 'n1', type: 'new_order', title: '🆕 Yeni Sipariş', message: '#26-00001 - 1.780 TL tutarında yeni sipariş', status: 'unread', created_at: new Date(Date.now() - 300000).toISOString() },
    { id: 'n2', type: 'payment', title: '✅ Ödeme Alındı', message: '#26-00001 - Ödeme onaylandı (IBAN)', status: 'unread', created_at: new Date(Date.now() - 600000).toISOString() },
    { id: 'n3', type: 'cargo', title: '🚚 Kargo Gönderildi', message: '#25-00003 - MNG Kargo ile gönderildi (Takip: 1234567890)', status: 'read', created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'n4', type: 'human_request', title: '👤 Yetkili Talebi', message: 'Müşteri iade talebinde bulundu, insan müdahalesi gerekiyor', status: 'read', created_at: new Date(Date.now() - 172800000).toISOString() },
    { id: 'n5', type: 'warning', title: '⚠️ Stok Uyarısı', message: 'Dana Parmak Sucuk stokta 5 KG altına düştü', status: 'unread', created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'n6', type: 'payment', title: '✅ Ödeme Alındı', message: '#25-00004 - Ödeme onaylandı (Kredi Kartı)', status: 'read', created_at: new Date(Date.now() - 259200000).toISOString() },
  ];

  const markRead = async (id: string) => {
    await fetch(`/api/notifications-api/${tid}/read/${id}`, { method: 'PUT' }).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, status: 'read' } : n));
  };

  const router = useRouter();

  const NAV_MAP: Record<string, string> = {
    new_order: '/orders', payment: '/orders', cargo: '/orders',
    human_request: '/complaints', callback: '/conversations', warning: '/health',
  };

  const handleClick = (n: Record<string, unknown>) => {
    const type = n.type as string;
    if (n.status === 'unread') markRead(n.id as string);
    const path = NAV_MAP[type] || '/dashboard';
    router.push(path);
  };

  const markAllRead = async () => {
    await fetch(`/api/notifications-api/${tid}/read-all`, { method: 'PUT' }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
  };

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter);
  const unread = notifications.filter((n) => n.status === 'unread').length;
  const filterList = ['all', ...Object.keys(NOTIF_CONFIG)];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bildirimler</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {unread > 0 ? `${unread} okunmamış bildirim` : 'Tüm bildirimler okundu'}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            <CheckCheck className="w-4 h-4" /> Tümünü Okundu İşaretle
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {filterList.map((key) => {
          const cfg = key === 'all' ? null : NOTIF_CONFIG[key];
          const active = filter === key;
          return (
            <button key={key} onClick={() => setFilter(key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                active
                  ? cfg
                    ? `${cfg.bg} ${cfg.text} ring-2 ${cfg.border}`
                    : 'bg-slate-700 dark:bg-slate-600 text-white ring-2 ring-slate-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}>
              {key === 'all' ? <Layers className="w-3.5 h-3.5" /> : cfg && <cfg.icon className="w-3.5 h-3.5" />}
              {key === 'all' ? 'Tümü' : cfg?.label}
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
              <Layers className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Bu kategoride henüz bildirim bulunmuyor</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tüm bildirimler görüntüleniyor</p>
          </div>
        ) : filtered.map((n) => {
          const type = n.type as string;
          const cfg = NOTIF_CONFIG[type];
          const Icon = cfg?.icon || Layers;
          const isUnread = n.status === 'unread';

          return (
            <div key={n.id as string}
              className={`group bg-white dark:bg-slate-800 rounded-xl border p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 cursor-pointer flex items-start gap-3 ${
                isUnread ? 'border-l-4 border-l-blue-500 border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700'
              }`}
              onClick={() => handleClick(n)}>
              {/* Left - Icon Badge */}
              <div className={`w-10 h-10 rounded-full ${cfg?.bg || 'bg-slate-100'} flex items-center justify-center shrink-0 ${cfg?.text || 'text-slate-500'}`}>
                {Icon && <Icon className="w-5 h-5" />}
              </div>

              {/* Center - Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title as string}</p>
                  {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">{n.message as string}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(n.created_at as string).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Right - Action */}
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {isUnread && (
                  <button onClick={(e) => { e.stopPropagation(); markRead(n.id as string); }}
                    className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors opacity-0 group-hover:opacity-100">
                    Okundu
                  </button>
                )}
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
