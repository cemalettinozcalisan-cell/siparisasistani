'use client';

import { useEffect, useState } from 'react';
import { Shield, Building2, Package, Users, Banknote, UserCheck, Bot, Search, Loader2, Plus, Eye, CreditCard, Settings, Ban, TrendingUp, Zap } from 'lucide-react';
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

  const topByRevenue = [...tenants]
    .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0))
    .slice(0, 3);

  return (
    <div className="p-4 md:p-6 space-y-5 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={22} className="text-indigo-500" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Geliştirici Paneli</h1>
          <span className="px-2.5 py-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-full text-[10px] font-bold shadow-sm">SÜPER YÖNETİCİ</span>
        </div>
        <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-xs font-semibold transition-all shadow-md">
          <Plus size={14} /> Yeni Firma Ekle
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Firma', value: stats.tenants, icon: Building2, gradient: 'from-blue-500 to-cyan-600' },
          { label: 'Sipariş', value: stats.orders, icon: Package, gradient: 'from-emerald-500 to-green-600' },
          { label: 'Müşteri', value: stats.customers, icon: Users, gradient: 'from-violet-500 to-purple-600' },
          { label: 'Ciro', value: `${Number(stats.revenue || 0).toLocaleString('tr-TR')} TL`, icon: Banknote, gradient: 'from-amber-500 to-orange-600' },
          { label: 'Kullanıcı', value: stats.users, icon: UserCheck, gradient: 'from-cyan-500 to-sky-600' },
          { label: 'AI Konuşma', value: stats.aiConversations, icon: Bot, gradient: 'from-pink-500 to-rose-600' },
        ].map((c) => (
          <div key={c.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 hover:shadow-md transition-all">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center mb-2 shadow-sm`}>
              <c.icon size={17} className="text-white" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{String(c.value || 0)}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tenant Table + Top Firms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tenant Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Building2 size={15} className="text-indigo-500" />
              Kayıtlı Firmalar ({filtered.length})
            </h2>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Firma ara..."
                className="pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 w-48" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5">Firma</th>
                  <th className="text-left px-4 py-2.5">Paket & Kota</th>
                  <th className="text-left px-4 py-2.5">Şehir</th>
                  <th className="text-left px-4 py-2.5">Durum</th>
                  <th className="text-right px-4 py-2.5">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                {filtered.map((t) => (
                  <tr key={t.id as string} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shrink-0 shadow-sm">
                          <Building2 size={14} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t.company_name as string}</p>
                          <p className="text-[10px] text-slate-400">{t.email as string}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {(t.plan_name as string) || 'Başlangıç'} · {(t.orders_used as number) || 0}/{(t.order_limit as number) || 150}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{(t.city as string) || '-'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm ${
                        t.status === 'active' ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-slate-300 dark:bg-slate-600'
                      }`}>{t.status === 'active' ? 'Aktif' : 'Pasif'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button title="Firma paneline geç" className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all">
                          <Eye size={15} />
                        </button>
                        <button title="Kota / Paket düzenle" className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all">
                          <CreditCard size={15} />
                        </button>
                        <button title="Firma detaylarını düzenle" className="p-2 text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-all">
                          <Settings size={15} />
                        </button>
                        <button title="Firmayı pasife al" className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                          <Ban size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-slate-400">
                    <Building2 size={20} className="mx-auto mb-2 opacity-30" />
                    {search ? 'Aramanızla eşleşen firma bulunamadı.' : 'Henüz kayıtlı firma yok.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 3 Firms */}
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-indigo-500" /> En Aktif Firmalar
            </h2>
            {topByRevenue.map((t, i) => (
              <div key={t.id as string} className={`flex items-center gap-3 py-2.5 ${i < topByRevenue.length - 1 ? 'border-b border-slate-50 dark:border-slate-700/50' : ''}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shadow-sm ${
                  i === 0 ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                  i === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                  'bg-gradient-to-br from-amber-600 to-amber-800'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{t.company_name as string}</p>
                  <p className="text-[10px] text-slate-400 truncate">{t.email as string} · {t.city as string || '-'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{Number(t.revenue || 0).toLocaleString('tr-TR')} TL</p>
                  <p className="text-[9px] text-slate-400">{Number(t.orders_count || 0)} sipariş</p>
                </div>
              </div>
            ))}
            {topByRevenue.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">Henüz veri yok</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/10 dark:to-violet-900/10 rounded-xl border border-indigo-200 dark:border-indigo-800/50 p-4 text-center">
            <Zap size={18} className="text-indigo-500 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Toplam {tenants.length} Firma</p>
            <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-0.5">
              {tenants.filter(t => t.status === 'active').length} aktif · {Number(stats.revenue || 0).toLocaleString('tr-TR')} TL ciro
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
