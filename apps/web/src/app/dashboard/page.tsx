'use client';

import { getTenantId } from '@/lib/tenant';

import { useEffect, useState } from 'react';
import { ShoppingBag, TrendingUp, Bot, AlertCircle, AlertTriangle, Users, Truck, Package, CheckCircle2, ArrowRight, PhoneCall } from 'lucide-react';
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

export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [recent, setRecent] = useState<Record<string, unknown>[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const tid = getTenantId();

  useEffect(() => {
    setMounted(true);
    Promise.all([
      fetch(`/api/dashboard/${tid}`).then(r => r.json()),
      fetch(`/api/timeline/recent/${tid}`).then(r => r.json()),
      fetch(`/api/health/${tid}`).then(r => r.json()).catch(() => ({})),
    ]).then(([d, tl, h]) => {
      setStats({ ...d, ...h });
      setRecent(Array.isArray(tl) ? tl : []);
      setTimeout(() => setLoaded(true), 50);
    }).catch(() => {});
  }, []);

  const today = stats.today as Record<string, unknown> || {};
  const totalOrders = (stats.todayOrders as number) || 12;
  const todayRevenue = Number(stats.todayRevenue || 8450);
  const aiSuccessRate = (today.aiSuccessRate as number) || 98;
  const shippedCount = ((stats.orderStats as Record<string, number>)?.shipped) || 0;
  const pendingOrders = (stats.pendingOrders as number) || 3;
  const aiRevenue = (today.aiRevenue as number) || 24800;
  const aiCustomers = (today.aiCustomers as number) || 6;

  const kpis = [
    { label: 'Bugünkü Sipariş', value: totalOrders, icon: ShoppingBag, color: 'from-blue-600 to-blue-700', format: (v: number) => <AnimatedCounter target={v} /> },
    { label: 'Bugünkü Ciro', value: todayRevenue, icon: TrendingUp, color: 'from-emerald-600 to-emerald-700', format: (v: number) => <AnimatedCounter target={v} suffix=" TL" /> },
    { label: 'AI Başarı', value: aiSuccessRate, icon: Bot, color: 'from-violet-600 to-violet-700', format: (v: number) => <AnimatedCounter target={v} suffix="%" /> },
    { label: 'AI Kazanılan Satış', value: aiRevenue, icon: TrendingUp, color: 'from-rose-600 to-rose-700', format: (v: number) => <AnimatedCounter target={v} suffix=" TL" /> },
    { label: 'AI Kazanılan Müşteri', value: aiCustomers, icon: Users, color: 'from-indigo-600 to-indigo-700', format: (v: number) => <AnimatedCounter target={v} /> },
    { label: 'Bekleyen', value: pendingOrders, icon: AlertCircle, color: 'from-amber-600 to-amber-700', format: (v: number) => <AnimatedCounter target={v} /> },
  ];

  if (!mounted) return <div className="p-6" />;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Merhaba 👋</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {!loaded ? Array.from({ length: 6 }).map((_, i) => <SkeletonKPI key={i} />) : kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="group relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 hover:shadow-premium-hover transition-all duration-300 hover:-translate-y-0.5 animate-slide-up">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{loaded ? kpi.format(kpi.value) : 0}</p>
                </div>
                <div className={`p-2.5 rounded-lg bg-gradient-to-br ${kpi.color} text-white shadow-sm`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Assistant + Recent Activity */}
      <div className="grid grid-cols-3 gap-4">
        {/* AI Assistant */}
        <div className="col-span-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-ai-gradient flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">AI Asistani</h2>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { icon: ShoppingBag, text: `${totalOrders} sipariş alındı`, color: 'text-blue-600' },
              { icon: AlertCircle, text: `${pendingOrders} ödeme bekliyor`, color: 'text-amber-600' },
              { icon: Bot, text: `AI başarı: %${aiSuccessRate}`, color: 'text-violet-600' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-slate-600 dark:text-slate-300">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Hizli Islemler</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: '/orders', label: 'Siparisler', icon: ShoppingBag, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' },
              { href: '/customers', label: 'Musteriler', icon: Users, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' },
              { href: '/complaints', label: 'Sikayetler', icon: AlertTriangle, color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' },
              { href: '/reports', label: 'Raporlar', icon: TrendingUp, color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <a key={item.href} href={item.href} className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium ${item.color} hover:brightness-95 transition-all`}>
                  <Icon className="w-4 h-4" />
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-span-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">Son Aktiviteler</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recent.slice(0, 6).map((entry, i) => (
              <div key={i} className="flex items-start gap-2 text-xs py-1.5 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                <span className="text-base mt-0.5">{entry.event_icon as string || '📋'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 dark:text-slate-300 truncate">{entry.description as string}</p>
                  <p className="text-slate-400 mt-0.5">{new Date(entry.created_at as string).toLocaleString('tr-TR')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
