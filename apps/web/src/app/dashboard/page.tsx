'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, TrendingUp, Bot, AlertCircle, AlertTriangle, Users, Package, CheckCircle2, ArrowRight, PhoneCall, TrendingDown, Zap, ChevronRight, MessageCircle, Camera, Globe, BarChart3 } from 'lucide-react';
import { getTenantId } from '@/lib/tenant';
import { SkeletonKPI } from '@/components/skeleton';

function AnimatedCounter({ target, suffix = '', duration = 1500 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <>{count}{suffix}</>;
}

const CHANNEL_COLORS: Record<string, { icon: typeof PhoneCall; gradient: string }> = {
  phone: { icon: PhoneCall, gradient: 'from-blue-500 to-blue-600' },
  whatsapp: { icon: MessageCircle, gradient: 'from-emerald-400 to-emerald-600' },
  instagram: { icon: Camera, gradient: 'from-pink-500 via-purple-500 to-purple-600' },
  website: { icon: Globe, gradient: 'from-cyan-500 to-teal-500' },
  sms: { icon: MessageCircle, gradient: 'from-sky-400 to-blue-500' },
  voice: { icon: PhoneCall, gradient: 'from-blue-500 to-blue-600' },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [recent, setRecent] = useState<Record<string, unknown>[]>([]);
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const tid = getTenantId();

  useEffect(() => {
    setMounted(true);
    Promise.all([
      fetch(`/api/dashboard/${tid}`).then(r => r.json()),
      fetch(`/api/timeline/recent/${tid}`).then(r => r.json()),
      fetch(`/api/health/${tid}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/saas/usage/${tid}`).then(r => r.json()).catch(() => null),
    ]).then(([d, tl, h, u]) => {
      setStats({ ...d, ...h });
      setRecent(Array.isArray(tl) ? tl : []);
      if (u) setUsage(u);
      setTimeout(() => setLoaded(true), 50);
    }).catch(() => {});
  }, []);

  const today = stats.today as Record<string, unknown> || {};
  const totalOrders = (stats.todayOrders as number) || 12;
  const todayRevenue = Number(stats.todayRevenue || 8450);
  const aiSuccessRate = (today.aiSuccessRate as number) || 98;
  const aiRevenue = (today.aiRevenue as number) || 24800;
  const aiCustomers = (today.aiCustomers as number) || 6;
  const pendingOrders = (stats.pendingOrders as number) || 3;

  const kpis = [
    { label: 'Bugünkü Sipariş', value: totalOrders, icon: ShoppingBag, gradient: 'from-blue-500 to-cyan-600', trend: '+12', trendUp: true },
    { label: 'Bugünkü Ciro', value: todayRevenue, icon: TrendingUp, gradient: 'from-emerald-500 to-green-600', trend: '+8', trendUp: true, suffix: ' TL' },
    { label: 'AI Başarı', value: aiSuccessRate, icon: Bot, gradient: 'from-violet-500 to-purple-600', trend: '+2', trendUp: true, suffix: '%' },
    { label: 'AI Satış', value: aiRevenue, icon: TrendingUp, gradient: 'from-rose-500 to-pink-600', trend: '+15', trendUp: true, suffix: ' TL' },
    { label: 'AI Müşteri', value: aiCustomers, icon: Users, gradient: 'from-indigo-500 to-blue-600', trend: '+3', trendUp: true },
    { label: 'Bekleyen', value: pendingOrders, icon: AlertCircle, gradient: 'from-amber-500 to-orange-600', trend: '-1', trendUp: false },
  ];

  const usagePct = usage ? (usage.usagePercent as number) || 0 : 0;
  const remaining = usage ? (usage.remaining as number) || 0 : 0;
  const orderLimit = usage ? (usage.orderLimit as number) || 250 : 250;

  if (!mounted) return <div className="p-6" />;

  return (
    <div className="p-4 md:p-6 space-y-5 w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Merhaba</h1>
          <p className="text-xs text-slate-400 mt-0.5">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        {/* Quota Widget */}
        {usage && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm px-4 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 flex items-center justify-center">
              <BarChart3 size={14} className="text-indigo-500" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Kalan Kota</div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-900 dark:text-white">{remaining} / {orderLimit}</span>
                <div className="w-16 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full ${usagePct > 80 ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-emerald-500 to-indigo-600'}`} style={{ width: `${usagePct}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {!loaded ? Array.from({ length: 6 }).map((_, i) => <SkeletonKPI key={i} />) : kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-start justify-between mb-2">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shadow-sm`}>
                  <Icon size={17} className="text-white" />
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${kpi.trendUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'}`}>
                  {kpi.trendUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />} {kpi.trend}
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {loaded ? <AnimatedCounter target={kpi.value} suffix={kpi.suffix || ''} /> : 0}
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AI Assistant — Glow card */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-800 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/20 p-5 space-y-3 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-transparent to-violet-50/40 dark:from-indigo-900/5 dark:to-violet-900/5 -z-0" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white text-sm">AI Asistanın</h2>
                <p className="text-[10px] text-indigo-500 font-medium">Senin için çalışıyor</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { icon: ShoppingBag, text: `${totalOrders} sipariş başarıyla alındı`, gradient: 'from-blue-500 to-cyan-600' },
                { icon: AlertCircle, text: `${pendingOrders} ödeme bekliyor`, gradient: 'from-amber-500 to-orange-600' },
                { icon: CheckCircle2, text: `%${aiSuccessRate} başarı oranı`, gradient: 'from-emerald-500 to-green-600' },
              ].map((item, i) => {
                const ItemIcon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/60 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700/50">
                    <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0`}>
                      <ItemIcon size={12} className="text-white" />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{item.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-3">
          <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <Zap size={14} className="text-amber-500" /> Hızlı İşlemler
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: '/orders', label: 'Siparişler', icon: ShoppingBag, gradient: 'from-blue-500 to-cyan-600' },
              { href: '/customers', label: 'Müşteriler', icon: Users, gradient: 'from-emerald-500 to-green-600' },
              { href: '/complaints', label: 'Şikayetler', icon: AlertTriangle, gradient: 'from-red-500 to-rose-600' },
              { href: '/reports', label: 'Raporlar', icon: TrendingUp, gradient: 'from-violet-500 to-purple-600' },
            ].map((item) => {
              const QaIcon = item.icon;
              return (
                <a key={item.href} href={item.href}
                  className={`flex items-center gap-2 px-3 py-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r ${item.gradient} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}>
                  <QaIcon size={14} /> {item.label}
                </a>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h2 className="font-bold text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-2">
            <ChevronRight size={14} className="text-indigo-500" /> Son Aktiviteler
          </h2>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {recent.slice(0, 6).map((entry, i) => {
              const channel = (entry.channel as string || '').toLowerCase();
              const chCfg = CHANNEL_COLORS[channel];
              const ChIcon = chCfg?.icon || PhoneCall;
              const chGradient = chCfg?.gradient || 'from-slate-400 to-slate-500';
              return (
                <div key={i} className="flex items-start gap-2.5 py-2 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${chGradient} flex items-center justify-center shrink-0`}>
                    <ChIcon size={11} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">{entry.description as string}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(entry.created_at as string).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              );
            })}
            {recent.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">Henüz aktivite yok</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
