'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, ShoppingCart, TrendingUp, AlertCircle, AlertTriangle, Users, User, UserCheck, Package, CheckCircle2, Phone, PhoneCall, Zap, ChevronRight, MessageCircle, Instagram, Camera, Globe, BarChart3, Settings, X, Truck, ExternalLink, Clock, UserPlus, GitPullRequest, MessageSquare, Wallet, Target, CreditCard, HelpCircle, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { TenantSwitcher } from '@/components/tenant-switcher';
import { NotificationBell } from '@/components/notification-bell';
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

// --- Orijinal marka logoları ---
function WhatsAppIcon() {
  return (
    <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 24 24">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99 0-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.285-.143-1.689-.834-1.951-.929-.263-.095-.454-.143-.645.143-.191.285-.74.929-.907 1.12-.167.19-.334.214-.619.071-.285-.143-1.206-.444-2.298-1.417-.85-.758-1.424-1.693-1.591-1.979-.167-.285-.018-.439.125-.581.129-.128.285-.334.428-.5.143-.167.191-.285.285-.477.095-.192.048-.358-.024-.5-.071-.143-.645-1.554-.883-2.126-.232-.557-.468-.481-.644-.49-.167-.008-.358-.01-.549-.01-.191 0-.501.071-.763.358-.263.285-1.002.978-1.002 2.385 0 1.407 1.026 2.768 1.169 2.959.143.191 2.019 3.084 4.891 4.324.683.295 1.217.472 1.633.604.687.218 1.312.187 1.806.113.551-.083 1.689-.69 1.928-1.358.238-.668.238-1.24.167-1.358-.071-.118-.262-.19-.547-.333z" />
    </svg>
  );
}

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Instagram">
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="25%" stopColor="#e6683c" />
          <stop offset="50%" stopColor="#dc2743" />
          <stop offset="75%" stopColor="#cc2366" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="24" height="24" rx="7" fill="url(#ig-grad)" />
      <circle cx="16" cy="16" r="5.5" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="23" cy="9.5" r="1.6" fill="#fff" />
    </svg>
  );
}

function PageThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
      aria-label="Tema değiştir"
    >
      {mounted && theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
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

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  NORMAL: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  LOW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
};

// AI Hub kanalları — renkli zeminli ikon kutuları + beyaz ikonlar
const HUB_LEFT = [
  { name: 'Telefon', sub: 'Arama alınıyor', icon: Phone, iconBg: 'bg-blue-500', cardBorder: 'border-blue-200 dark:border-blue-500/40', glow: 'hover:shadow-blue-500/20', dotColor: 'bg-blue-500', lineStroke: '#3b82f6' },
  { name: 'WhatsApp', sub: 'Mesaj alınıyor', icon: WhatsAppIcon, iconBg: 'bg-emerald-500', cardBorder: 'border-emerald-200 dark:border-emerald-500/40', glow: 'hover:shadow-emerald-500/20', dotColor: 'bg-emerald-500', lineStroke: '#10b981' },
  { name: 'Instagram DM', sub: 'DM alınıyor', icon: Instagram, iconBg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600', cardBorder: 'border-pink-200 dark:border-pink-500/40', glow: 'hover:shadow-pink-500/20', dotColor: 'bg-fuchsia-500', lineStroke: '#d946ef' },
];

const HUB_RIGHT = [
  { name: 'SMS', sub: 'Mesaj alınıyor', icon: MessageSquare, iconBg: 'bg-orange-500', cardBorder: 'border-orange-200 dark:border-orange-500/40', glow: 'hover:shadow-orange-500/20', dotColor: 'bg-amber-500', lineStroke: '#f59e0b' },
  { name: 'Web Siteniz', sub: 'Sipariş alınıyor', icon: Globe, iconBg: 'bg-blue-600', cardBorder: 'border-blue-200 dark:border-blue-500/40', glow: 'hover:shadow-blue-500/20', dotColor: 'bg-cyan-500', lineStroke: '#06b6d4' },
];

const HUB_FEATURES = [
  { icon: ShoppingBag, text: 'Siparişleri alır' },
  { icon: UserCheck, text: 'Müşterileri tanır' },
  { icon: HelpCircle, text: 'Soruları yanıtlar' },
  { icon: CreditCard, text: 'Ödemeyi yönetir' },
  { icon: Truck, text: 'Kargoyu takip eder' },
  { icon: TrendingUp, text: 'İşletmenizi büyütür' },
];

function getCargoUrl(company: string, tracking: string): string {
  const base = CARGO_TRACKING_URLS[String(company || '').toLowerCase()] || CARGO_TRACKING_URLS.yurtici;
  if (!tracking) return base;
  return base;
}

// --- Ortak Modal ---
function Modal({ title, icon, onClose, children, wide }: { title: string; icon?: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-16 overflow-y-auto" onClick={onClose}>
      <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-2xl'} animate-scale-in`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            {icon && <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center">{icon}</div>}
            <h2 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400">
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
  const tid = getTenantId();

  // Modal state
  const [showTodayModal, setShowTodayModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showComplaintsModal, setShowComplaintsModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);

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

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const today = stats.today as Record<string, unknown> || {};
  const totalOrders = (stats.todayOrders as number) || 37;
  const todayRevenue = Number(stats.todayRevenue || 28760);
  const aiSuccessRate = (stats.aiSuccessRate as number) ?? (today.aiSuccessRate as number) ?? 97;
  const aiRevenue = Number(stats.aiRevenue ?? 24800);
  const aiCustomers = Number(stats.aiCustomers ?? 15);
  const pendingOrders = Number(stats.pendingOrders ?? 20);
  const complaints24h = (stats.complaints24h as Record<string, any>[]) || [];
  const complaintsCount = complaints24h.length || 5;
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

  const remaining = usage ? (usage.remaining as number) || 0 : 0;
  const orderLimit = usage ? (usage.orderLimit as number) || 250 : 250;

  const kpis = [
    { label: 'Bugünkü Sipariş', value: totalOrders, icon: ShoppingCart, color: 'text-blue-500', iconBg: 'bg-blue-50 dark:bg-blue-500/15', trend: '↑ %19', onClick: () => setShowTodayModal(true) },
    { label: 'Bekleyen', value: pendingOrders, icon: Clock, color: 'text-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-500/15', trend: '↑ %12', onClick: () => setShowPendingModal(true) },
    { label: 'Talep & İstek', value: complaintsCount, icon: AlertCircle, color: 'text-pink-500', iconBg: 'bg-pink-50 dark:bg-pink-500/15', trend: '↑ %14', onClick: () => setShowComplaintsModal(true) },
    { label: 'Bugünkü Ciro', value: todayRevenue, icon: Wallet, color: 'text-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-500/15', trend: '↑ %22', suffix: ' TL', onClick: () => setShowRevenueModal(true) },
    { label: 'AI Müşteri', value: aiCustomers, icon: User, color: 'text-purple-500', iconBg: 'bg-purple-50 dark:bg-purple-500/15', trend: '↑ %33' },
    { label: 'AI Satış', value: aiRevenue, icon: TrendingUp, color: 'text-blue-500', iconBg: 'bg-blue-50 dark:bg-blue-500/15', trend: '↑ %28', suffix: ' TL' },
    { label: 'AI Başarı', value: 97, icon: Target, color: 'text-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-500/15', trend: '↑ %4', suffix: '%' },
  ];

  if (!mounted) return <div className="p-6" />;

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-4rem)] lg:min-h-screen bg-gradient-to-tr from-[#F1F5F9] via-[#F8FAFC] to-[#EFF6FF] dark:from-[#020410] dark:via-[#05081C] dark:to-[#0A0E2E] text-slate-900 dark:text-white p-4 md:p-8 space-y-8 w-full animate-fade-in">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-100/70 dark:bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-100/60 dark:bg-purple-600/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-cyan-100/50 dark:bg-cyan-500/10 blur-3xl" />

      <div className="relative z-10 space-y-8">
        {/* Özel sayfa header (desktop — layout header /dashboard'da lg: gizli) */}
        <div className="hidden lg:flex items-center justify-between w-full border-b border-slate-200/70 dark:border-slate-800/80 pb-6">
          <div className="flex items-center gap-3.5">
            <img src="/logo2.png" alt="SiparişAsistanı" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-violet-600 via-fuchsia-500 to-blue-600 dark:from-violet-400 dark:via-fuchsia-400 dark:to-blue-400 bg-clip-text text-transparent">SiparişAsistanı</h1>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">Akıllı Sipariş, Güçlü İşletme.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TenantSwitcher />
            <div className="flex items-center gap-1 bg-white/90 dark:bg-[#0C1027]/70 border border-slate-200/70 dark:border-slate-800 rounded-full px-1.5 py-1">
              <PageThemeToggle />
              <NotificationBell size="text-base" />
            </div>
            {usage && (
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-[#0C1027]/70 text-xs">
                <BarChart3 size={13} className="text-indigo-500" />
                <span className="font-medium text-slate-500 dark:text-slate-400">Sipariş Hakkı:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{remaining} / {orderLimit}</span>
              </div>
            )}
            <div className="px-4 py-2 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#0C1027]/80 flex items-center gap-2.5 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-normal text-slate-600 dark:text-slate-300">Sistem Aktif</span>
            </div>
            <div className="text-slate-700 dark:text-slate-300 text-xs font-semibold leading-tight text-right shrink-0">
              Her kanal. Tek asistan.<br />Daha güçlü bir işletme.
            </div>
          </div>
        </div>

        {/* AI Orchestration Hub — Müşterileriniz Nerede Olursa Olsun */}
        <div className="text-center lg:pt-2">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Müşterileriniz Nerede Olursa Olsun
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">
            Yapay zeka, tüm kanallardan gelen siparişleri sizin için yönetir.
          </p>
        </div>

        {/* Orkestrasyon alanı — yüzen kartlar + bağlantı hatları */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-4 items-center relative">
          {/* Kavisli bağlantı hatları */}
          <div className="hidden lg:block absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 1000 400" fill="none" preserveAspectRatio="none">
              <path d="M 250 80 C 290 80, 310 140, 335 140" stroke="#3b82f6" strokeWidth="2" className="opacity-50 dark:opacity-70" />
              <path d="M 250 200 C 285 200, 300 200, 335 200" stroke="#10b981" strokeWidth="2" className="opacity-50 dark:opacity-70" />
              <path d="M 250 320 C 290 320, 310 260, 335 260" stroke="#d946ef" strokeWidth="2" className="opacity-50 dark:opacity-70" />
              <path d="M 583 140 C 543 140, 520 165, 495 165" stroke="#f59e0b" strokeWidth="2" className="opacity-50 dark:opacity-70" />
              <path d="M 583 260 C 543 260, 520 235, 495 235" stroke="#06b6d4" strokeWidth="2" className="opacity-50 dark:opacity-70" />
              <circle cx="250" cy="80" r="3" fill="#3b82f6" />
              <circle cx="335" cy="140" r="4.5" fill="#3b82f6" className="animate-pulse" />
              <circle cx="250" cy="200" r="3" fill="#10b981" />
              <circle cx="335" cy="200" r="4.5" fill="#10b981" className="animate-pulse" />
              <circle cx="250" cy="320" r="3" fill="#d946ef" />
              <circle cx="335" cy="260" r="4.5" fill="#d946ef" className="animate-pulse" />
              <circle cx="583" cy="140" r="3" fill="#f59e0b" />
              <circle cx="495" cy="165" r="4.5" fill="#f59e0b" className="animate-pulse" />
              <circle cx="583" cy="260" r="3" fill="#06b6d4" />
              <circle cx="495" cy="235" r="4.5" fill="#06b6d4" className="animate-pulse" />
            </svg>
          </div>

          {/* Sol kanallar */}
          <div className="lg:col-span-3 flex flex-row lg:flex-col gap-3 flex-wrap justify-center lg:justify-end z-10">
            {HUB_LEFT.map((ch) => {
              const ChIcon = ch.icon;
              return (
                <div key={ch.name} className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-indigo-950/40 border ${ch.cardBorder} shadow-[0_4px_25px_rgba(0,0,0,0.03)] dark:shadow-[0_0_15px_rgba(99,102,241,0.1)] ${ch.glow} hover:shadow-lg transition-all w-56 lg:w-full max-w-[15rem]`}>
                  <div className={`w-11 h-11 rounded-xl ${ch.iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
                    <ChIcon size={22} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{ch.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{ch.sub}</p>
                  </div>
                  {/* Sağ kenar ortası bağlantı noktası */}
                  <span className={`absolute right-[-5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${ch.dotColor} ring-2 ring-white dark:ring-slate-900 hidden lg:block`} />
                </div>
              );
            })}
          </div>

          {/* Merkez AI Çekirdek */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center gap-6 z-10 py-6">
            <div className="relative">
              <div className="absolute inset-[-28px] rounded-full border border-indigo-100/70 dark:border-purple-500/10" />
              <div className="absolute inset-[-15px] rounded-full border border-indigo-200/50 dark:border-indigo-500/20" />
              <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full bg-white dark:bg-[#0C1027] border border-slate-100/80 dark:border-indigo-500/40 shadow-[0_4px_40px_rgba(99,102,241,0.12)] dark:shadow-[0_0_40px_rgba(168,85,247,0.35)] flex items-center justify-center">
                <div className="absolute inset-[-8px] rounded-full border-2 border-indigo-100 dark:border-indigo-500/20 animate-ping [animation-duration:3s]" />
                <img src="/logo2.png" alt="AI Çekirdek" className="w-20 h-20 md:w-24 md:h-24 object-contain dark:drop-shadow-[0_0_20px_rgba(99,102,241,0.85)]" />
              </div>
            </div>
            <div className="rounded-full bg-white/95 dark:bg-[#0C1027]/80 border border-slate-200/80 dark:border-cyan-400/50 shadow-md dark:shadow-[0_0_20px_rgba(6,182,212,0.4)] px-8 py-2.5 flex items-baseline gap-2">
              <span className="text-sm font-bold text-blue-600 dark:text-cyan-400 tracking-wide">AI Aktif</span>
              <span className="text-xl font-extrabold text-indigo-700 dark:text-indigo-400 tabular-nums">%97</span>
            </div>
          </div>

          {/* Sağ kanallar */}
          <div className="lg:col-span-2 flex flex-row sm:flex-col gap-3 flex-wrap justify-center sm:justify-start z-10">
            {HUB_RIGHT.map((ch) => {
              const ChIcon = ch.icon;
              return (
                <div key={ch.name} className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-indigo-950/40 border ${ch.cardBorder} shadow-[0_4px_25px_rgba(0,0,0,0.03)] dark:shadow-[0_0_15px_rgba(99,102,241,0.1)] ${ch.glow} hover:shadow-lg transition-all w-56 sm:w-full max-w-[15rem]`}>
                  <div className={`w-11 h-11 rounded-xl ${ch.iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
                    <ChIcon size={22} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{ch.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{ch.sub}</p>
                  </div>
                  {/* Sol kenar ortası bağlantı noktası */}
                  <span className={`absolute left-[-5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${ch.dotColor} ring-2 ring-white dark:ring-slate-900 hidden lg:block`} />
                </div>
              );
            })}
          </div>

          {/* Özellik Paneli (Glassmorphism) */}
          <div className="lg:col-span-3 flex justify-center lg:justify-end items-stretch z-10">
            <div className="rounded-2xl bg-white/90 dark:bg-[#0C1027]/60 border border-slate-200/70 dark:border-indigo-500/20 backdrop-blur-md shadow-[0_4px_25px_rgba(0,0,0,0.04)] dark:shadow-2xl p-4 flex flex-col justify-center gap-2.5 w-full max-w-[15rem] h-full">
              {HUB_FEATURES.map((f) => {
                const FIcon = f.icon;
                return (
                  <div key={f.text} className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span className="w-6 h-6 rounded-md bg-violet-50 dark:bg-violet-500/15 flex items-center justify-center shrink-0">
                      <FIcon size={13} className="text-violet-500" />
                    </span>
                    {f.text}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 7 KPI — tek sıra */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {!loaded ? Array.from({ length: 7 }).map((_, i) => <SkeletonKPI key={i} />) : kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <button
                key={kpi.label}
                onClick={kpi.onClick}
                className={`group bg-white dark:bg-[#0C1027]/40 border border-slate-100/80 dark:border-slate-800 dark:hover:border-indigo-500/40 rounded-2xl p-4 shadow-[0_4px_15px_rgba(0,0,0,0.02)] dark:shadow-2xl hover:shadow-md dark:hover:shadow-indigo-500/10 transition-all ${kpi.onClick ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-8 h-8 rounded-full ${kpi.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon size={16} className={kpi.color} />
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{kpi.label}</span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white text-center mb-2 tabular-nums">
                  {loaded ? <AnimatedCounter target={kpi.value} suffix={kpi.suffix || ''} /> : 0}
                </div>
                <div className="flex items-center justify-center">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {kpi.trend}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Alt satır: Hızlı İşlemler + Son Aktiviteler */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Quick Actions */}
          <div className="rounded-2xl bg-white dark:bg-[#0C1027] border border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-xl p-5 space-y-3">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Zap size={14} className="text-amber-500" /> Hızlı İşlemler
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { href: '/orders', label: 'Siparişler', icon: ShoppingBag, color: 'text-blue-500', iconBox: 'bg-blue-50 dark:bg-blue-500/15' },
                { href: '/customers', label: 'Müşteriler', icon: Users, color: 'text-emerald-500', iconBox: 'bg-emerald-50 dark:bg-emerald-500/15' },
                { href: '/products', label: 'Ürünler', icon: Package, color: 'text-amber-500', iconBox: 'bg-amber-50 dark:bg-amber-500/15' },
                { href: '/calls', label: 'Görüşmeler', icon: PhoneCall, color: 'text-cyan-500', iconBox: 'bg-cyan-50 dark:bg-cyan-500/15' },
                { href: '/complaints', label: 'Talepler', icon: AlertTriangle, color: 'text-rose-500', iconBox: 'bg-rose-50 dark:bg-rose-500/15' },
                { href: '/reports', label: 'Raporlar', icon: TrendingUp, color: 'text-violet-500', iconBox: 'bg-violet-50 dark:bg-violet-500/15' },
              ].map((item) => {
                const QaIcon = item.icon;
                return (
                  <a key={item.href} href={item.href}
                    className="flex items-center gap-2 px-3 py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200/70 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 shadow-sm hover:shadow-md dark:hover:shadow-indigo-500/10 transition-all">
                    <div className={`w-8 h-8 rounded-lg ${item.iconBox} flex items-center justify-center shrink-0`}>
                      <QaIcon size={15} className={item.color} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{item.label}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-2xl bg-white dark:bg-[#0C1027] border border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-xl p-5">
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
                  <div key={i} className="flex items-start gap-2.5 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
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

        {/* Footer slogan */}
        <div className="text-center py-6">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-violet-500/90 dark:text-violet-400/80">
            Daha Fazla Zaman <span className="mx-3 opacity-60">•</span> Daha Fazla Satış <span className="mx-3 opacity-60">•</span> Daha Mutlu Müşteriler
          </p>
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
              <div key={o.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
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
                    <span key={idx} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
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
                  <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2">
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
                    <span key={idx} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
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
              <div key={c.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
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

      {/* Modal: Bugünkü Ciro & Satış Detayları (YENİ) */}
      {showRevenueModal && (
        <Modal title="Bugünkü Ciro & Satış Detayları" icon={<Wallet size={15} />} onClose={() => setShowRevenueModal(false)} wide>
          <div className="space-y-4">
            {/* Özet */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 p-3 text-center">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Toplam Satış</p>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{todayOrdersList.length} adet</p>
              </div>
              <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 p-3 text-center">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Bugünkü Ciro</p>
                <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{Number(todayRevenue).toLocaleString('tr-TR')} TL</p>
              </div>
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 p-3 text-center">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Ort. Sepet</p>
                <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {todayOrdersList.length > 0 ? Math.round(todayRevenue / todayOrdersList.length).toLocaleString('tr-TR') : 0} TL
                </p>
              </div>
            </div>

            {/* 24 saat satış listesi */}
            <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
              {(todayOrdersList.length > 0 ? todayOrdersList : [
                { id: 'demo-1', order_number: '26-00001', total_price: 1780, customer_name: 'Zafer Ayyıldız', customer_phone: '05321234567', customer_city: 'Afyonkarahisar', created_at: new Date().toISOString(), items: [{ product_name: 'Dana Parmak Sucuk', quantity: 2, unit: 'KG', total: 1780 }] },
                { id: 'demo-2', order_number: '26-00002', total_price: 4500, customer_name: 'Mehmet Öztürk', customer_phone: '05339876543', customer_city: 'Afyonkarahisar', created_at: new Date().toISOString(), items: [{ product_name: 'Pastırma', quantity: 3, unit: 'KG', total: 3600 }] },
              ]).map((o) => (
                <div key={o.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">#{o.order_number}</span>
                      <span className="text-[11px] text-slate-400">{new Date(o.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{Number(o.total_price).toLocaleString('tr-TR')} TL</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <UserPlus size={12} className="text-indigo-500" /> <b>{o.customer_name}</b>
                    <span>•</span> {o.customer_phone}
                    {o.customer_city && <><span>•</span> {o.customer_city}</>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(o.items || []).map((it: any, idx: number) => (
                      <span key={idx} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {it.product_name} × {it.quantity} {it.unit || ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {todayOrdersList.length === 0 && <div className="py-8 text-center text-xs text-slate-400">Son 24 saatte satış bulunmuyor</div>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}