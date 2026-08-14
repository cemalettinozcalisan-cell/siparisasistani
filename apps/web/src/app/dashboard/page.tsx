'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, TrendingUp, AlertCircle, AlertTriangle, Users, Package, CheckCircle2, Phone, PhoneCall, Zap, ChevronRight, MessageCircle, Camera, Globe, BarChart3, Settings, X, Truck, ExternalLink, Clock, UserPlus, GitPullRequest, MessageSquare, Wallet, Target, CreditCard, Sun, Moon, Send } from 'lucide-react';
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
function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="#25D366" aria-label="WhatsApp">
      <path d="M16.004 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.59 4.46 1.71 6.4L3.2 28.8l6.57-1.68a12.74 12.74 0 0 0 6.23 1.6h.01c7.06 0 12.79-5.74 12.79-12.8S23.06 3.2 16.004 3.2zm0 23.36h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-3.9 1 1.04-3.8-.25-.39a10.56 10.56 0 0 1-1.62-5.66c0-5.87 4.78-10.65 10.66-10.65 2.84 0 5.51 1.11 7.52 3.12a10.56 10.56 0 0 1 3.11 7.53c0 5.87-4.78 10.65-10.66 10.65zm5.85-7.98c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.72.16-.21.32-.82 1.04-1.01 1.25-.18.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65 0 1.56 1.14 3.07 1.3 3.28.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.89-.77 2.16-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37z" />
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

// --- Referans komponent bileşenleri ---
function ChannelCard({ icon, title, subtitle, dotColor, borderColor, bgColor, alignLeft = false }: { icon: React.ReactNode; title: string; subtitle: string; dotColor: string; borderColor: string; bgColor: string; alignLeft?: boolean }) {
  return (
    <div className={`relative flex items-center gap-3 rounded-2xl border ${borderColor} ${bgColor} p-3 transition duration-300 hover:scale-[1.02] shadow-sm`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-black/40 shadow-sm">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-bold leading-none text-slate-900 dark:text-white">{title}</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <span className={`absolute ${alignLeft ? '-left-1.5' : '-right-1.5'} top-1/2 -translate-y-1/2 h-3 w-3 rounded-full ${dotColor} ring-4 ring-white dark:ring-[#080822]`} />
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 py-1 text-xs text-slate-600 dark:text-slate-300">
      <div className="text-violet-500 dark:text-violet-400 shrink-0">{icon}</div>
      <span>{text}</span>
    </div>
  );
}

function StatCard({ title, value, trend, icon, highlight = false, onClick }: { title: string; value: React.ReactNode; trend: string; icon: React.ReactNode; highlight?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-3.5 backdrop-blur-sm transition text-left ${highlight ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10' : 'border-slate-200 dark:border-violet-500/20 bg-white/80 dark:bg-white/[0.03]'} shadow-sm ${onClick ? 'cursor-pointer hover:border-violet-300 dark:hover:border-violet-500/40' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">{title}</span>
        {icon}
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-lg font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">{value}</span>
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{trend}</span>
      </div>
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

// AI Hub kanalları — referans komponente birebir
const HUB_LEFT = [
  { name: 'Telefon', sub: 'Arama alınıyor', icon: Phone, dotColor: 'bg-blue-500', borderColor: 'border-blue-200 dark:border-blue-500/30', bgColor: 'bg-blue-50/50 dark:bg-blue-950/20' },
  { name: 'WhatsApp', sub: 'Mesaj alınıyor', icon: WhatsAppIcon, dotColor: 'bg-emerald-500', borderColor: 'border-emerald-200 dark:border-emerald-500/30', bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20' },
  { name: 'Instagram DM', sub: 'DM alınıyor', icon: InstagramIcon, dotColor: 'bg-pink-500', borderColor: 'border-pink-200 dark:border-pink-500/30', bgColor: 'bg-pink-50/50 dark:bg-pink-950/20' },
];

const HUB_RIGHT = [
  { name: 'SMS', sub: 'Mesaj alınıyor', icon: Send, dotColor: 'bg-orange-500', borderColor: 'border-orange-200 dark:border-orange-500/30', bgColor: 'bg-orange-50/50 dark:bg-orange-950/20' },
  { name: 'Web Sitesi', sub: 'Sipariş alınıyor', icon: Globe, dotColor: 'bg-cyan-500', borderColor: 'border-cyan-200 dark:border-cyan-500/30', bgColor: 'bg-cyan-50/50 dark:bg-cyan-950/20' },
];

const HUB_FEATURES = [
  { icon: ShoppingBag, text: 'Siparişleri alır' },
  { icon: UserPlus, text: 'Müşterileri tanır' },
  { icon: MessageSquare, text: 'Soruları yanıtlar' },
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
    { label: 'Bugünkü Sipariş', value: totalOrders, icon: ShoppingBag, color: 'text-blue-500', iconBox: 'bg-blue-50 dark:bg-blue-500/15', trend: '↑ %19', onClick: () => setShowTodayModal(true) },
    { label: 'Bekleyen', value: pendingOrders, icon: Clock, color: 'text-amber-500', iconBox: 'bg-amber-50 dark:bg-amber-500/15', trend: '↑ %12', onClick: () => setShowPendingModal(true) },
    { label: 'Talep & İstek', value: complaintsCount, icon: GitPullRequest, color: 'text-pink-500', iconBox: 'bg-pink-50 dark:bg-pink-500/15', trend: '↑ %14', onClick: () => setShowComplaintsModal(true) },
    { label: 'Bugünkü Ciro', value: todayRevenue, icon: Wallet, color: 'text-emerald-500', iconBox: 'bg-emerald-50 dark:bg-emerald-500/15', trend: '↑ %22', suffix: ' TL', onClick: () => setShowRevenueModal(true) },
    { label: 'AI Müşteri', value: aiCustomers, icon: Users, color: 'text-purple-500', iconBox: 'bg-purple-50 dark:bg-purple-500/15', trend: '↑ %33' },
    { label: 'AI Satış', value: aiRevenue, icon: TrendingUp, color: 'text-cyan-500', iconBox: 'bg-cyan-50 dark:bg-cyan-500/15', trend: '↑ %28', suffix: ' TL' },
    { label: 'AI Başarı', value: aiSuccessRate, icon: Target, color: 'text-emerald-500', iconBox: 'bg-emerald-50 dark:bg-emerald-500/15', trend: '↑ %4', suffix: '%' },
  ];

  if (!mounted) return <div className="p-6" />;

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-4rem)] lg:min-h-screen bg-[#F8FAFC] dark:bg-[#080B1A] text-slate-900 dark:text-white p-4 md:p-8 space-y-8 w-full animate-fade-in">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-100/70 dark:bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-100/60 dark:bg-purple-600/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-cyan-100/50 dark:bg-cyan-500/10 blur-3xl" />

      <div className="relative z-10 space-y-6">
        {/* HERO CARD — referans komponente birebir */}
        <section className="relative w-full overflow-hidden rounded-[28px] border border-slate-200 dark:border-indigo-500/20 bg-white dark:bg-[#080822] px-6 py-6 text-slate-900 dark:text-white shadow-xl transition-colors duration-300">
          {/* Arka Plan Glow Efektleri */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-violet-400/20 dark:bg-violet-600/20 blur-[110px]" />
            <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-blue-400/20 dark:bg-blue-600/20 blur-[120px]" />
            <div className="absolute bottom-0 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-fuchsia-300/20 dark:bg-fuchsia-600/10 blur-[120px]" />
          </div>

          {/* Üst Header / Logo & Durum */}
          <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
                  <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">SiparişAsistanı</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Akıllı Sipariş, Güçlü İşletme.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <TenantSwitcher />
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1 py-0.5">
                <PageThemeToggle />
                <NotificationBell />
              </div>
              {usage && (
                <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs">
                  <BarChart3 size={12} className="text-violet-500" />
                  <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{remaining} / {orderLimit}</span>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-400/10 px-4 py-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">Sistem Aktif</span>
              </div>
            </div>
          </div>

          {/* Ana Başlık */}
          <div className="relative z-10 mt-6 text-center">
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              Müşterileriniz{" "}
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-blue-600 dark:from-violet-400 dark:via-fuchsia-400 dark:to-blue-400 bg-clip-text text-transparent">
                Nerede Olursa Olsun
              </span>
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-xs md:text-sm text-slate-500 dark:text-slate-400">
              Yapay zeka, tüm kanallardan gelen siparişleri sizin için yönetir.
            </p>
          </div>

          {/* ORTA ORCHESTRATION ALANI (3 Sütun + SVG Bağlantıları) */}
          <div className="relative z-10 mt-8 grid grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_280px_1fr]">
            {/* SOL SÜTUN - 3 Kanal */}
            <div className="flex flex-col gap-4">
              {HUB_LEFT.map((ch) => (
                <ChannelCard
                  key={ch.name}
                  icon={<ch.icon size={20} />}
                  title={ch.name}
                  subtitle={ch.sub}
                  dotColor={ch.dotColor}
                  borderColor={ch.borderColor}
                  bgColor={ch.bgColor}
                />
              ))}
            </div>

            {/* MERKEZ - Dairesel AI Çekirdeği */}
            <div className="relative flex flex-col items-center justify-center py-4">
              <svg className="absolute inset-0 hidden w-full h-full pointer-events-none lg:block" viewBox="0 0 280 280">
                <path d="M 0 50 Q 80 50, 140 140" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
                <path d="M 0 140 Q 70 140, 140 140" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.6" />
                <path d="M 0 230 Q 80 230, 140 140" fill="none" stroke="#ec4899" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
                <path d="M 280 80 Q 200 80, 140 140" fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
                <path d="M 280 200 Q 200 200, 140 140" fill="none" stroke="#06b6d4" strokeWidth="2" opacity="0.6" />
              </svg>

              <div className="relative flex h-56 w-56 items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-violet-300 dark:border-violet-500/30 animate-pulse" />
                <div className="absolute inset-4 rounded-full border border-blue-300 dark:border-blue-500/30" />
                <div className="absolute inset-8 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 blur-xl" />
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-violet-400 dark:border-violet-400/60 bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-900/80 dark:to-blue-900/80 shadow-[0_0_50px_rgba(139,92,246,0.3)]">
                  <svg className="w-16 h-16 text-violet-600 dark:text-violet-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                    <path d="M4 11a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7z" />
                    <circle cx="9" cy="14" r="1" fill="currentColor" />
                    <circle cx="15" cy="14" r="1" fill="currentColor" />
                    <path d="M10 18h4" />
                  </svg>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 rounded-full border border-violet-300 dark:border-violet-400/40 bg-white dark:bg-violet-950/80 px-6 py-1.5 shadow-md">
                <span className="text-xs font-semibold text-violet-600 dark:text-violet-300">AI Aktif</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">%{aiSuccessRate}</span>
              </div>
            </div>

            {/* SAĞ SÜTUN - 2 Kanal + Neler Yapabilir Özellik Paneli */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                {HUB_RIGHT.map((ch) => (
                  <ChannelCard
                    key={ch.name}
                    icon={<ch.icon size={20} />}
                    title={ch.name}
                    subtitle={ch.sub}
                    dotColor={ch.dotColor}
                    borderColor={ch.borderColor}
                    bgColor={ch.bgColor}
                    alignLeft
                  />
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-indigo-500/20 bg-slate-50/80 dark:bg-white/[0.03] p-3.5 backdrop-blur-sm">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2 block">Neler Yapabilir?</span>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
                  {HUB_FEATURES.map((f) => {
                    const FIcon = f.icon;
                    return <FeatureItem key={f.text} icon={<FIcon className="w-3.5 h-3.5" />} text={f.text} />;
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 7 KPI METRİK KARTLARI */}
          <div className="relative z-10 mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
            {!loaded
              ? Array.from({ length: 7 }).map((_, i) => <SkeletonKPI key={i} />)
              : kpis.map((kpi) => {
                  const Icon = kpi.icon;
                  return (
                    <StatCard
                      key={kpi.label}
                      title={kpi.label}
                      value={<AnimatedCounter target={kpi.value} suffix={kpi.suffix || ''} />}
                      trend={kpi.trend}
                      icon={<Icon size={16} className={kpi.color} />}
                      highlight={kpi.label === 'AI Başarı'}
                      onClick={kpi.onClick}
                    />
                  );
                })}
          </div>

          {/* En Alt Slogan */}
          <div className="relative z-10 mt-6 text-center">
            <p className="text-[11px] font-bold tracking-[0.3em] text-violet-600/80 dark:text-violet-400/80">
              DAHA FAZLA ZAMAN <span className="mx-2">•</span> DAHA FAZLA SATIŞ <span className="mx-2">•</span> DAHA MUTLU MÜŞTERİLER
            </p>
          </div>
        </section>

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