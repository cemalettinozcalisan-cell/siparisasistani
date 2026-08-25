'use client';

import { useEffect, useState } from 'react';
import { Shield, Building2, Package, Users, Banknote, UserCheck, Bot, Search, Loader2, Plus, Eye, CreditCard, Settings, Ban, TrendingUp, Zap, Activity, Bell } from 'lucide-react';
import { getUserRole, setTenantId } from '@/lib/tenant';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [tenants, setTenants] = useState<Record<string, unknown>[]>([]);
  const [tenantHealth, setTenantHealth] = useState<Record<string, unknown>[]>([]);
  const [selectedHealth, setSelectedHealth] = useState<Record<string, unknown> | null>(null);
  const [costs, setCosts] = useState<Record<string, unknown>[]>([]);
  const [alertSettings, setAlertSettings] = useState<Record<string, any> | null>(null);
  const [alertSaved, setAlertSaved] = useState(false);
  const [search, setSearch] = useState('');

  const headers = { 'Content-Type': 'application/json' };

  const reload = () => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => setStats(d)).catch(() => {});
    fetch('/api/admin/tenants').then(r => r.json()).then(d => { if (Array.isArray(d)) setTenants(d); }).catch(() => {});
    fetch('/api/admin/tenants/health').then(r => r.json()).then(d => { if (Array.isArray(d)) setTenantHealth(d); }).catch(() => {});
    fetch('/api/admin/costs').then(r => r.json()).then(d => { if (Array.isArray(d)) setCosts(d); }).catch(() => {});
    fetch('/api/alert/settings').then(r => r.json()).then(d => { if (d) setAlertSettings(d); }).catch(() => {});
  };

  const saveAlertSettings = async () => {
    if (!alertSettings) return;
    await fetch('/api/alert/settings', {
      method: 'PUT', headers, body: JSON.stringify(alertSettings),
    });
    setAlertSaved(true);
    setTimeout(() => setAlertSaved(false), 2000);
  };

  useEffect(() => {
    const role = getUserRole();
    if (role !== 'owner') { router.replace('/dashboard'); return; }
    setAuthorized(true);
    setChecking(false);
    reload();
  }, [router]);

  const handlePanel = (t: Record<string, unknown>) => {
    setTenantId(t.id as string);
    router.push('/dashboard');
  };

  const handleQuota = async (t: Record<string, unknown>) => {
    const val = prompt(`Yeni sipariş limiti (mevcut: ${t.order_limit || '-'}):`);
    if (!val) return;
    await fetch(`/api/admin/tenants/${t.id}/quota`, {
      method: 'PUT', headers, body: JSON.stringify({ order_limit: Number(val) }),
    });
    reload();
  };

  const handleEdit = async (t: Record<string, unknown>) => {
    const name = prompt('Firma adı:', t.company_name as string);
    if (name === null) return;
    const email = prompt('E-posta:', t.email as string);
    if (email === null) return;
    await fetch(`/api/admin/tenants/${t.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ company_name: name, email }),
    });
    reload();
  };

  const handleToggleStatus = async (t: Record<string, unknown>) => {
    const newStatus = t.status === 'active' ? 'suspended' : 'active';
    await fetch(`/api/admin/tenants/${t.id}/status`, {
      method: 'PUT', headers, body: JSON.stringify({ status: newStatus }),
    });
    reload();
  };

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

  const CHANNEL_COLS = [
    { key: 'phone', label: 'Telefon' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'sms', label: 'SMS' },
    { key: 'website', label: 'Web' },
  ];

  const channelDot = (status: string) => {
    if (status === 'ok') return 'bg-emerald-500 shadow-sm shadow-emerald-500/40';
    if (status === 'degraded') return 'bg-amber-500 shadow-sm shadow-amber-500/40';
    if (status === 'down') return 'bg-red-500 shadow-sm shadow-red-500/40';
    return 'bg-slate-300 dark:bg-slate-600';
  };

  const hasProblem = (t: Record<string, unknown>) => {
    const ch = (t.channels as Record<string, string>) || {};
    return Object.values(ch).some((s) => s === 'degraded' || s === 'down');
  };

  return (
    <div className="p-4 md:p-6 space-y-5 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
            <Shield size={16} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Geliştirici Paneli</h1>
          <span className="px-2.5 py-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-full text-[10px] font-bold shadow-sm">SÜPER YÖNETİCİ</span>
        </div>
        <button onClick={() => router.push('/onboarding')}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-xs font-semibold transition-all shadow-md">
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
                        <button onClick={() => handlePanel(t)} title="Firma paneline geç" className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => handleQuota(t)} title="Kota / Paket düzenle" className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all">
                          <CreditCard size={15} />
                        </button>
                        <button onClick={() => handleEdit(t)} title="Firma detaylarını düzenle" className="p-2 text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-all">
                          <Settings size={15} />
                        </button>
                        <button onClick={() => handleToggleStatus(t)} title="Firmayı pasife al" className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
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
              {tenants.filter(t => t.status === 'active').length} aktif {Number(stats.revenue || 0).toLocaleString('tr-TR')} TL ciro
            </p>
          </div>
        </div>
      </div>

      {/* Esnaf Kanal Sağlığı (1B) — proaktif arıza tespiti */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Activity size={15} className="text-emerald-500" />
            Esnaf Kanal Sağlığı
          </h2>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Çalışıyor</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Arızalı</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Kesinti</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" /> Veri Yok</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="text-left px-4 py-2.5">Esnaf</th>
                {CHANNEL_COLS.map((c) => (
                  <th key={c.key} className="text-center px-3 py-2.5">{c.label}</th>
                ))}
                <th className="text-right px-4 py-2.5">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {(tenantHealth as any[]).map((t) => {
                const ch = (t.channels as Record<string, string>) || {};
                const problem = hasProblem(t);
                return (
                  <tr key={t.tenant_id as string} onClick={() => setSelectedHealth(selectedHealth?.tenant_id === t.tenant_id ? null : t)}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer ${problem ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${problem ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t.company_name as string}</p>
                      </div>
                    </td>
                    {CHANNEL_COLS.map((c) => (
                      <td key={c.key} className="px-3 py-2.5 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${channelDot(ch[c.key] || 'unknown')}`} />
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right">
                      <button className="text-indigo-500 hover:text-indigo-700 text-[11px] font-medium">Görüntüle</button>
                    </td>
                  </tr>
                );
              })}
              {tenantHealth.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-slate-400">
                  Henüz kanal sağlık verisi yok. Kanallar aktif kullanıldığında otomatik dolar.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Kanal Detay Paneli */}
        {selectedHealth && (() => {
          const t = selectedHealth;
          const detail = (t.detail as Record<string, any>) || {};
          return (
            <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Building2 size={15} className="text-indigo-500" /> {t.company_name as string}
                </h3>
                <button onClick={() => setSelectedHealth(null)} className="text-[11px] text-slate-400 hover:text-slate-600">Kapat</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {CHANNEL_COLS.map((c) => {
                  const d = detail[c.key] || {};
                  const st = d.status || 'unknown';
                  return (
                    <div key={c.key} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{c.label}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st === 'ok' ? 'bg-emerald-100 text-emerald-700' : st === 'degraded' ? 'bg-amber-100 text-amber-700' : st === 'down' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                          {st === 'ok' ? 'Çalışıyor' : st === 'degraded' ? 'Arızalı' : st === 'down' ? 'Kesinti' : 'Veri Yok'}
                        </span>
                      </div>
                      <div className="space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <p>Son başarı: {d.last_success_at ? new Date(d.last_success_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                        <p>Son hata: {d.last_error_at ? new Date(d.last_error_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                        {d.last_error && <p className="text-red-500 truncate" title={String(d.last_error)}>Hata: {String(d.last_error)}</p>}
                        <p>Son 1 saat: {Number(d.success_count_1h || 0)} başarılı / {Number(d.error_count_1h || 0)} hata</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Arıza Bildirim Ayarları (Faz 4) */}
      {alertSettings && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Bell size={15} className="text-red-500" />
              Arıza Bildirimleri (E-posta / WhatsApp / SMS)
            </h2>
            <span className="text-[10px] text-slate-400">Arıza tespit edilince size dış bildirim gider</span>
          </div>
          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* İletişim */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">İletişim Bilgileri</h3>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">E-posta</label>
                <input type="email" value={alertSettings.owner_email || ''}
                  onChange={(e) => setAlertSettings({ ...alertSettings, owner_email: e.target.value })}
                  placeholder="ornek@sirket.com" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">WhatsApp numarası</label>
                <input type="tel" value={alertSettings.whatsapp_phone || ''}
                  onChange={(e) => setAlertSettings({ ...alertSettings, whatsapp_phone: e.target.value })}
                  placeholder="05321234567" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">SMS numarası (WhatsApp yedek)</label>
                <input type="tel" value={alertSettings.sms_phone || ''}
                  onChange={(e) => setAlertSettings({ ...alertSettings, sms_phone: e.target.value })}
                  placeholder="05321234567" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20" />
              </div>
            </div>

            {/* Kanallar + Toplulaştırma */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Bildirim Kanalları</h3>
              <div className="space-y-2">
                {[
                  { key: 'email_enabled', label: 'E-posta', desc: 'Arıza e-postası gönderilir' },
                  { key: 'whatsapp_enabled', label: 'WhatsApp', desc: 'WhatsApp mesajı gönderilir (yapılandırılmışsa)' },
                  { key: 'sms_enabled', label: 'SMS', desc: 'WhatsApp çalışmazsa SMS yedek gönderilir' },
                ].map((c) => (
                  <label key={c.key} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{c.label}</p>
                      <p className="text-[11px] text-slate-400">{c.desc}</p>
                    </div>
                    <input type="checkbox" checked={!!alertSettings[c.key]}
                      onChange={(e) => setAlertSettings({ ...alertSettings, [c.key]: e.target.checked })}
                      className="w-5 h-5 accent-red-500" />
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Toplulaştırma eşiği</label>
                  <input type="number" min="2" value={alertSettings.aggregation_threshold ?? 2}
                    onChange={(e) => setAlertSettings({ ...alertSettings, aggregation_threshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none" />
                  <p className="text-[10px] text-slate-400 mt-1">Aynı sorun bu kadar esnafta olursa tek bildirim</p>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Pencere (dakika)</label>
                  <input type="number" min="1" value={alertSettings.aggregation_window_min ?? 5}
                    onChange={(e) => setAlertSettings({ ...alertSettings, aggregation_window_min: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none" />
                </div>
              </div>
            </div>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end">
            <button onClick={saveAlertSettings}
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition-all ${alertSaved ? 'bg-emerald-500' : 'bg-red-600 hover:bg-red-700'}`}>
              <Bell size={13} /> {alertSaved ? 'Kaydedildi!' : 'Bildirim Ayarlarını Kaydet'}
            </button>
          </div>
        </div>
      )}

      {/* Per-Esnaf Maliyet & Katkı (3E) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Banknote size={15} className="text-emerald-500" />
            Esnaf Başına Maliyet & Katkı (Son 30 Gün)
          </h2>
          <span className="text-[10px] text-slate-400">AI API maliyeti, paket fiyatıyla karşılaştırılır</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="text-left px-4 py-2.5">Esnaf</th>
                <th className="text-left px-3 py-2.5">Plan</th>
                <th className="text-right px-3 py-2.5">AI Maliyet</th>
                <th className="text-right px-3 py-2.5">Görüşme</th>
                <th className="text-right px-3 py-2.5">Paket</th>
                <th className="text-right px-4 py-2.5">Katkı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {(costs as any[]).map((c) => (
                <tr key={c.tenant_id as string} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{c.company_name as string}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{c.plan as string}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">{(c.ai_cost_30d as number || 0).toFixed(2)} TL</td>
                  <td className="px-3 py-2.5 text-right text-xs text-slate-500 dark:text-slate-400">{c.calls_30d as number || 0}</td>
                  <td className="px-3 py-2.5 text-right text-xs text-slate-500 dark:text-slate-400">{(c.package_price as number || 0).toLocaleString('tr-TR')} TL</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`text-xs font-bold ${(c.contribution as number || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {(c.contribution as number || 0).toLocaleString('tr-TR')} TL
                    </span>
                  </td>
                </tr>
              ))}
              {costs.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-slate-400">
                  Maliyet verisi yok. AI görüşmeleri yapıldıkça otomatik dolar.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
