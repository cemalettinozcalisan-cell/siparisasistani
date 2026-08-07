'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, CreditCard, ShoppingBag, Truck, UserCheck, PhoneCall, AlertTriangle, ChevronRight, Clock, Layers, Bell } from 'lucide-react';

const NOTIF_CONFIG: Record<string, { label: string; icon: typeof ShoppingBag; gradient: string; bg: string; text: string; iconBg: string }> = {
  new_order: { label: 'Sipariş', icon: ShoppingBag, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-500' },
  payment: { label: 'Ödeme', icon: CreditCard, gradient: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500' },
  cargo: { label: 'Kargo', icon: Truck, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-500' },
  human_request: { label: 'Yetkili', icon: UserCheck, gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', iconBg: 'bg-violet-500' },
  callback: { label: 'Geri Arama', icon: PhoneCall, gradient: 'from-indigo-500 to-blue-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', iconBg: 'bg-indigo-500' },
  warning: { label: 'Uyarı', icon: AlertTriangle, gradient: 'from-red-500 to-rose-500', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', iconBg: 'bg-red-500' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Record<string, unknown>[]>([]);
  const [filter, setFilter] = useState('all');
  const [tid, setTid] = useState('');

  useEffect(() => { import('@/lib/tenant').then(m => setTid(m.getTenantId())); }, []);

  const load = async () => {
    if (!tid) return;
    try {
      const res = await fetch(`/api/notifications-api/${tid}?limit=100`);
      const data = await res.json();
      if (Array.isArray(data)) setNotifications(data.length > 0 ? data : getMockNotifications());
    } catch { setNotifications(getMockNotifications()); }
  };
  useEffect(() => { load(); }, [tid]);

  const getMockNotifications = () => [
    { id: 'n1', type: 'new_order', title: 'Yeni Sipariş', message: '#26-00001 - 1.780 TL tutarında yeni sipariş', status: 'unread', created_at: new Date(Date.now() - 300000).toISOString() },
    { id: 'n2', type: 'payment', title: 'Ödeme Alındı', message: '#26-00001 - Ödeme onaylandı (IBAN)', status: 'unread', created_at: new Date(Date.now() - 600000).toISOString() },
    { id: 'n3', type: 'cargo', title: 'Kargo Gönderildi', message: '#25-00003 - MNG Kargo ile gönderildi (Takip: 1234567890)', status: 'read', created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'n4', type: 'human_request', title: 'Yetkili Talebi', message: 'Müşteri iade talebinde bulundu, insan müdahalesi gerekiyor', status: 'read', created_at: new Date(Date.now() - 172800000).toISOString() },
    { id: 'n5', type: 'warning', title: 'Stok Uyarısı', message: 'Dana Parmak Sucuk stokta 5 KG altına düştü', status: 'unread', created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'n6', type: 'payment', title: 'Ödeme Alındı', message: '#25-00004 - Ödeme onaylandı (Kredi Kartı)', status: 'read', created_at: new Date(Date.now() - 259200000).toISOString() },
  ];

  const markRead = async (id: string) => {
    await fetch(`/api/notifications-api/${tid}/read/${id}`, { method: 'PUT' }).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, status: 'read' } : n));
  };
  const router = useRouter();
  const NAV_MAP: Record<string, string> = { new_order: '/orders', payment: '/orders', cargo: '/orders', human_request: '/complaints', callback: '/orders', warning: '/health' };
  const handleClick = (n: Record<string, unknown>) => {
    if (n.status === 'unread') markRead(n.id as string);
    router.push(NAV_MAP[n.type as string] || '/dashboard');
  };
  const markAllRead = async () => {
    await fetch(`/api/notifications-api/${tid}/read-all`, { method: 'PUT' }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
  };
  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter);
  const unread = notifications.filter((n) => n.status === 'unread').length;
  const filterList = ['all', ...Object.keys(NOTIF_CONFIG)];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell size={22} className="text-indigo-500" /> Bildirimler
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {unread > 0 ? `${unread} okunmamış bildirim` : 'Tüm bildirimler okundu'}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            <CheckCheck size={14} /> Tümünü Okundu İşaretle
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                active
                  ? 'text-white shadow-sm ' + (cfg ? `bg-gradient-to-r ${cfg.gradient}` : 'bg-gradient-to-r from-slate-600 to-slate-700')
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}>
              {key === 'all' ? <Layers size={12} /> : cfg && <cfg.icon size={12} />}
              {key === 'all' ? 'Tümü' : cfg?.label}
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <Layers size={24} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Bu kategoride bildirim bulunmuyor</p>
          </div>
        ) : filtered.map((n) => {
          const type = n.type as string;
          const cfg = NOTIF_CONFIG[type];
          const Icon = cfg?.icon || Layers;
          const isUnread = n.status === 'unread';

          return (
            <div key={n.id as string}
              className={`group bg-white dark:bg-slate-800 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-start gap-3 p-4 ${
                isUnread ? 'border-l-4 border-l-indigo-500 border-slate-200 dark:border-slate-700 bg-indigo-50/30 dark:bg-indigo-900/5' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
              onClick={() => handleClick(n)}>
              <div className={`w-10 h-10 rounded-xl ${cfg?.bg || 'bg-slate-100 dark:bg-slate-700'} flex items-center justify-center shrink-0`}>
                <Icon size={18} className={cfg?.text || 'text-slate-500'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title as string}</p>
                  {isUnread && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 animate-pulse" />}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">{n.message as string}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Clock size={12} className="text-slate-400" />
                  <span className="text-[10px] text-slate-400">
                    {new Date(n.created_at as string).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {isUnread && (
                  <button onClick={(e) => { e.stopPropagation(); markRead(n.id as string); }}
                    className="px-2.5 py-1 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-full text-[10px] font-semibold shadow-sm hover:from-indigo-600 hover:to-violet-600 transition-all opacity-0 group-hover:opacity-100">
                    Okundu
                  </button>
                )}
                <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
