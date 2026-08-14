'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, TrendingUp, Bot, AlertCircle, AlertTriangle, Users, Package, CheckCircle2, PhoneCall, Zap, ChevronRight, MessageCircle, Camera, Globe, BarChart3, Settings, LayoutDashboard, X, Truck, ExternalLink, Clock, UserPlus, GitPullRequest } from 'lucide-react';
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
  system: { icon: Settings, gradient: 'from-indigo-500 to-violet-600' },
};

// Kargo firma takip linkleri (statik)
const CARGO_TRACKING_URLS: Record<string, string> = {
  yurtici: 'https://gonderitakip.yurticikargo.com/',
  mng: 'https://app.mngkargo.com.tr/mngkargo/staticcontent/urun-takip/',
  aras: 'https://kargotakip.araskargo.com.tr/',
  ptt: 'https://gonderitakip.ptt.gov.tr/',
  surat: 'https://www.suratkargo.com.tr/KargoTakip',
  dhl: 'https://www.dhl.com/tr-tr/home/tracking.html',
};
const CARGO_FIRMA_ADI: Record<string, string> = {
  yurtici: 'Yurtiçi Kargo', mng: 'MNG Kargo', aras: 'Aras Kargo', ptt: 'PTT Kargo', surat: 'Sürat Kargo', dhl: 'DHL',
};

const AI_CHANNELS = [
  { name: 'Telefon', icon: PhoneCall, gradient: 'from-blue-500 to-blue-600', status: 'AKTİF', statusColor: 'text-emerald-400' },
  { name: 'WhatsApp', icon: MessageCircle, gradient: 'from-emerald-400 to-emerald-600', status: 'AKTİF', statusColor: 'text-emerald-400' },
  { name: 'Instagram', icon: Camera, gradient: 'from-pink-500 via-purple-500 to-purple-600', status: 'AKTİF', statusColor: 'text-emerald-400' },
  { name: 'SMS', icon: MessageCircle, gradient: 'from-sky-400 to-blue-500', status: 'AKTİF', statusColor: 'text-emerald-400' },
  { name: 'Web', icon: Globe, gradient: 'from-cyan-500 to-teal-500', status: 'BAĞLANMADI', statusColor: 'text-amber-400' },
];

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  NORMAL: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  LOW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
};

function getCargoUrl(company: string, tracking: string): string {
  const base = CARGO_TRACKING_URLS[String(company || '').toLowerCase()] || CARGO_TRACKING_URLS.yurtici;
  if (!tracking) return base;
  return base;
}

// --- Ortak Modal ---
function Modal({ title, icon, onClose, children, wide }: { title: string; icon?: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-16 overflow-y-auto" onClick={onClose}>
      <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-2xl'} animate-scale-in`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            {icon && <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center">{icon}</div>}
            <h2 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [recent, setRecent] = useState<Record<string, unknown>[]>([]);
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [clock, setClock] = useState<string>('');
  const tid = getTenantId();

  // Modal state
  const [showTodayModal, setShowTodayModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showComplaintsModal, setShowComplaintsModal] = useState(false);

  // Toaster
  const [toast, setToast] = useState<string | null>(null);

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

  // Futuristik saat
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const today = stats.today as Record<string, unknown> || {};
  const totalOrders = (stats.todayOrders as number) || 12;
  const todayRevenue = Number(stats.todayRevenue || 8450);
  const aiSuccessRate = (stats.aiSuccessRate as number) ?? (today.aiSuccessRate as number) ?? 98;
  const aiRevenue = Number(stats.aiRevenue ?? 24800);
  const aiCustomers = Number(stats.aiCustomers ?? 6);
  const pendingOrders = Number(stats.pendingOrders ?? 3);
  const complaints24h = (stats.complaints24h as Record<string, any>[]) || [];
  const todayOrdersList = (stats.todayOrdersList as Record<string, any>[]) || [];
  const pendingOrdersList = (stats.pendingOrdersList as Record<string, any>[]) || [];

  // Bekleyen siparişi "Teslim Edildi" yap (simülasyon)
  const markDelivered = (orderId: string) => {
    setStats((prev) => ({
      ...prev,
      pendingOrders: Math.max(0, Number(prev.pendingOrders || 0) - 1),
      pendingOrdersList: (prev.pendingOrdersList as Record<string, any>[] || []).filter((o) => o.id !== orderId),
    }));
    setToast(`Sipariş teslim edildi olarak işaretlendi`);
  };

  const totalRevenue = Number(stats.totalRevenue ?? 24800);
  const totalCustomers = Number(stats.totalCustomers ?? 126);

  const usagePct = usage ? (usage.usagePercent as number) || 0 : 0;
  const remaining = usage ? (usage.remaining as number) || 0 : 0;
  const orderLimit = usage ? (usage.orderLimit as number) || 250 : 250;

  if (!mounted) return <div className="p-6" />;

  return (
    <div className="p-4 md:p-6 space-y-5 w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
              <LayoutDashboard size={16} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Kontrol Paneli</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Futuristik Saat Badge */}
          <div className="rounded-xl border border-cyan-500/30 bg-slate-900/90 px-4 py-2.5 flex items-center gap-3 shadow-lg shadow-cyan-500/10">
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-cyan-400" />
              <span className="text-lg font-bold text-cyan-400 tabular-nums tracking-wider font-mono">{clock}</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              CANLI
            </span>
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
      </div>

      {/* 4+3 KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Satır 1: 4 kart */}
        {[
          { label: 'Bugünkü Sipariş', value: totalOrders, icon: ShoppingBag, gradient: 'from-blue-500 to-cyan-600', suffix: '', onClick: () => setShowTodayModal(true) },
          { label: 'Bekleyen', value: pendingOrders, icon: AlertCircle, gradient: 'from-amber-500 to-orange-600', suffix: '', onClick: () => setShowPendingModal(true) },
          { label: 'Talep & İstek', value: complaints24h.length, icon: GitPullRequest, gradient: 'from-rose-500 to-pink-600', suffix: '', onClick: () => setShowComplaintsModal(true) },
          { label: 'Bugünkü Ciro', value: todayRevenue, icon: TrendingUp, gradient: 'from-emerald-500 to-green-600', suffix: ' TL' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.label}
              onClick={kpi.onClick}
              className={`group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-left ${kpi.onClick ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shadow-sm`}>
                  <Icon size={17} className="text-white" />
                </div>
                {kpi.onClick && <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />}
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {loaded ? <AnimatedCounter target={kpi.value} suffix={kpi.suffix || ''} /> : 0}
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{kpi.label}</p>
            </button>
          );
        })}
      </div>

      {/* Satır 2: 3 AI kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'AI Müşteri', value: aiCustomers, icon: Users, gradient: 'from-indigo-500 to-blue-600', suffix: '', sub: 'Bugün AI ile görüşen' },
          { label: 'AI Satış', value: aiRevenue, icon: TrendingUp, gradient: 'from-rose-500 to-pink-600', suffix: ' TL', sub: 'Bugünkü AI ciro' },
          { label: 'AI Başarı', value: aiSuccessRate, icon: Bot, gradient: 'from-violet-500 to-purple-600', suffix: '%', sub: 'Devretmeyen görüşme' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-start justify-between mb-2">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shadow-sm`}>
                  <Icon size={17} className="text-white" />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-300">{kpi.sub}</span>
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
        {/* AI Agent — 5 kanallı neon kart */}
        <div className="rounded-xl bg-slate-900 dark:bg-slate-900 border border-slate-700/60 shadow-lg shadow-indigo-500/10 p-5 space-y-3 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/40">
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm">AI Ajanların</h2>
                <p className="text-[10px] text-cyan-400 font-medium">5 kanalda senin için çalışıyor</p>
              </div>
            </div>
            <div className="space-y-2">
              {AI_CHANNELS.map((ch) => {
                const ChIcon = ch.icon;
                return (
                  <div key={ch.name} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/40 hover:bg-white/10 transition-all">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${ch.gradient} flex items-center justify-center shrink-0`}>
                      <ChIcon size={13} className="text-white" />
                    </div>
                    <span className="flex-1 text-xs font-semibold text-slate-200">{ch.name}</span>
                    <span className={`text-[10px] font-bold ${ch.statusColor}`}>{ch.status}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between px-2.5 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <span className="text-[11px] font-semibold text-cyan-300">AI Başarı Oranı</span>
              <span className="text-sm font-bold text-cyan-300">%{aiSuccessRate}</span>
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
              { href: '/products', label: 'Ürünler', icon: Package, gradient: 'from-amber-500 to-orange-600' },
              { href: '/calls', label: 'Görüşmeler', icon: PhoneCall, gradient: 'from-teal-500 to-cyan-600' },
              { href: '/complaints', label: 'Talepler', icon: AlertTriangle, gradient: 'from-red-500 to-rose-600' },
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

      {/* Toaster */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl px-4 py-3 shadow-2xl animate-slide-in-up">
          <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-500" />
          <span className="text-xs font-semibold">{toast}</span>
        </div>
      )}

      {/* Modal: Bugünkü Sipariş */}
      {showTodayModal && (
        <Modal title="Bugünkü Siparişler" icon={<ShoppingBag size={15} />} onClose={() => setShowTodayModal(false)} wide>
          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {(todayOrdersList.length > 0 ? todayOrdersList : [
              { id: 'demo-1', order_number: '26-00001', total_price: 1780, customer_name: 'Zafer Ayyıldız', customer_phone: '05321234567', customer_city: 'Afyonkarahisar', customer_address: 'Atatürk Cad. No:42', created_at: new Date().toISOString(), items: [{ product_name: 'Dana Parmak Sucuk', quantity: 2, unit: 'KG', total: 1780 }] },
              { id: 'demo-2', order_number: '26-00002', total_price: 4500, customer_name: 'Mehmet Öztürk', customer_phone: '05339876543', customer_city: 'Afyonkarahisar', customer_address: 'Zafer Mah.', created_at: new Date().toISOString(), items: [{ product_name: 'Pastırma', quantity: 3, unit: 'KG', total: 3600 }, { product_name: 'Dana Parmak Sucuk', quantity: 1, unit: 'KG', total: 890 }] },
            ]).map((o) => (
              <div key={o.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">#{o.order_number}</span>
                    <span className="text-[11px] text-slate-400">{new Date(o.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{Number(o.total_price).toLocaleString('tr-TR')} TL</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <UserPlus size={12} className="text-indigo-500" /> <b>{o.customer_name}</b>
                  <span>•</span> {o.customer_phone}
                  {o.customer_city && <><span>•</span> {o.customer_city}</>}
                </div>
                {o.customer_address && <p className="text-[11px] text-slate-400">📍 {o.customer_address}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {(o.items || []).map((it: any, idx: number) => (
                    <span key={idx} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                      {it.product_name} × {it.quantity} {it.unit || ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {todayOrdersList.length === 0 && <div className="py-8 text-center text-xs text-slate-400">Bugün henüz sipariş yok</div>}
          </div>
        </Modal>
      )}

      {/* Modal: Bekleyen Siparişler */}
      {showPendingModal && (
        <Modal title="Ödeme Bekleyen Siparişler" icon={<AlertCircle size={15} />} onClose={() => setShowPendingModal(false)} wide>
          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {(pendingOrdersList.length > 0 ? pendingOrdersList : [
              { id: 'demo-p1', order_number: '26-00001', total_price: 1780, customer_name: 'Zafer Ayyıldız', customer_phone: '05321234567', customer_city: 'Afyonkarahisar', cargo_company: 'yurtici', tracking_number: 'YT1234567890', items: [{ product_name: 'Dana Parmak Sucuk', quantity: 2, unit: 'KG', total: 1780 }] },
              { id: 'demo-p2', order_number: '26-00002', total_price: 4500, customer_name: 'Mehmet Öztürk', customer_phone: '05339876543', customer_city: 'Afyonkarahisar', cargo_company: 'mng', tracking_number: 'MNG98765432', items: [{ product_name: 'Pastırma', quantity: 3, unit: 'KG', total: 3600 }] },
            ]).map((o) => (
              <div key={o.id} className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">#{o.order_number}</span>
                    <span className="text-[11px] text-slate-400">{o.customer_city}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{Number(o.total_price).toLocaleString('tr-TR')} TL</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <UserPlus size={12} className="text-indigo-500" /> <b>{o.customer_name}</b>
                  <span>•</span> {o.customer_phone}
                </div>
                {/* Kargo Takip */}
                {o.cargo_company && (
                  <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-3 py-2">
                    <Truck size={13} className="text-indigo-500 shrink-0" />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex-1">
                      {CARGO_FIRMA_ADI[String(o.cargo_company).toLowerCase()] || o.cargo_company}
                      {o.tracking_number && <b className="text-slate-700 dark:text-slate-200"> · {o.tracking_number}</b>}
                    </span>
                    <a href={getCargoUrl(o.cargo_company, o.tracking_number)} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                      <ExternalLink size={11} /> Takip Et
                    </a>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {(o.items || []).map((it: any, idx: number) => (
                    <span key={idx} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                      {it.product_name} × {it.quantity} {it.unit || ''}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => markDelivered(o.id)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all">
                  <CheckCircle2 size={13} /> Teslim Edildi Olarak İşaretle
                </button>
              </div>
            ))}
            {pendingOrdersList.length === 0 && <div className="py-8 text-center text-xs text-slate-400">Bekleyen sipariş yok 🎉</div>}
          </div>
        </Modal>
      )}

      {/* Modal: Talep & İstek */}
      {showComplaintsModal && (
        <Modal title="Son 24 Saat Talepleri" icon={<GitPullRequest size={15} />} onClose={() => setShowComplaintsModal(false)}>
          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {(complaints24h.length > 0 ? complaints24h : [
              { id: 'c1', event_type: 'COMPLAINT_OPEN', description: 'Müşteri: Ürünlerin son kullanma tarihi geçmiş', channel: 'WHATSAPP', severity: 'CRITICAL', ticket_number: 'TKT-0001', created_at: new Date().toISOString() },
              { id: 'c2', event_type: 'COMPLAINT_OPEN', description: 'Müşteri iade talebinde bulundu', channel: 'VOICE', severity: 'HIGH', ticket_number: 'TKT-0002', created_at: new Date().toISOString() },
            ]).map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={13} className="text-rose-500" />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{c.ticket_number || c.event_type}</span>
                    <span className="text-[10px] text-slate-400">{c.channel}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${SEVERITY_STYLES[c.severity] || SEVERITY_STYLES.NORMAL}`}>{c.severity}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{c.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  <a href={`/complaints?id=${c.id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                    Detayları Gör <ChevronRight size={11} />
                  </a>
                </div>
              </div>
            ))}
            {complaints24h.length === 0 && <div className="py-8 text-center text-xs text-slate-400">Son 24 saatte talep yok</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}