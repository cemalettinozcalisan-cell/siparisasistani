'use client';

import { useEffect, useState } from 'react';
import { Shield, Building2, Package, Users, DollarSign, UserCheck, Bot, Search, Loader2 } from 'lucide-react';
import { getUserRole } from '@/lib/tenant';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [tenants, setTenants] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const role = getUserRole();
    if (role !== 'owner') { router.replace('/dashboard'); return; }
    setAuthorized(true);
    setChecking(false);

    fetch('/api/admin/stats').then(r => r.json()).then(d => setStats(d)).catch(() => {});
    fetch('/api/admin/tenants').then(r => r.json()).then(d => { if (Array.isArray(d)) setTenants(d); }).catch(() => {});
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!authorized) return null;

  const filtered = tenants.filter(t =>
    !search || (
      (t.company_name as string || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.city as string || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.email as string || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Shield size={20} className="text-indigo-500" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Geliştirici Paneli</h1>
        <span className="px-2 py-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-full text-[10px] font-bold">SÜPER YÖNETİCİ</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Firma', value: stats.tenants, icon: Building2, color: 'from-blue-500 to-cyan-500', iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600' },
          { label: 'Sipariş', value: stats.orders, icon: Package, color: 'from-emerald-500 to-teal-500', iconBg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-600' },
          { label: 'Müşteri', value: stats.customers, icon: Users, color: 'from-violet-500 to-purple-500', iconBg: 'bg-violet-50 dark:bg-violet-900/20', iconColor: 'text-violet-600' },
          { label: 'Ciro', value: `${Number(stats.revenue || 0).toLocaleString('tr-TR')} TL`, icon: DollarSign, color: 'from-amber-500 to-orange-500', iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600' },
          { label: 'Kullanıcı', value: stats.users, icon: UserCheck, color: 'from-cyan-500 to-sky-500', iconBg: 'bg-cyan-50 dark:bg-cyan-900/20', iconColor: 'text-cyan-600' },
          { label: 'AI Konuşma', value: stats.aiConversations, icon: Bot, color: 'from-pink-500 to-rose-500', iconBg: 'bg-pink-50 dark:bg-pink-900/20', iconColor: 'text-pink-600' },
        ].map((c) => (
          <div key={c.label} className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 ${c.color.includes('from') ? '' : ''}`}>
            <div className={`w-8 h-8 rounded-lg ${c.iconBg} flex items-center justify-center mb-2`}>
              <c.icon size={16} className={c.iconColor} />
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{String(c.value || 0)}</div>
            <div className="text-[10px] text-gray-400">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2">
            <Building2 size={15} className="text-indigo-500" />
            Kayıtlı Firmalar ({filtered.length})
          </h2>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Firma ara..."
              className="pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-700 focus:ring-1 focus:ring-indigo-200 outline-none w-48"
            />
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {filtered.map((t) => (
            <div key={t.id as string} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-200">{t.company_name as string}</p>
                <p className="text-xs text-gray-400">{t.email as string}{t.phone ? ` · ${t.phone}` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Building2 size={10} /> {t.city as string || '-'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  t.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}>
                  {t.status as string}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-xs text-gray-400">
              {search ? 'Aramanızla eşleşen firma bulunamadı.' : 'Henüz kayıtlı firma yok.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
