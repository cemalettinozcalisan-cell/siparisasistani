'use client';

import { useEffect, useRef, useState } from 'react';
import { ShoppingBag, ShoppingCart, TrendingUp, AlertCircle, AlertTriangle, Users, User, UserCheck, Package, CheckCircle2, Phone, PhoneCall, Zap, ChevronRight, ChevronDown, Instagram, Globe, Settings, X, Truck, ExternalLink, UserPlus, MessageSquare, Wallet, Target, CreditCard, HelpCircle, Banknote, HandCoins, MapPin, Copy, Ticket, ArrowUp, ArrowDown, Clock } from 'lucide-react';
import { WhatsAppIcon, ChannelIconType } from '@/components/channel-icons';
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

const CHANNEL_COLORS: Record<string, { icon: ChannelIconType; gradient: string }> = {
  phone: { icon: PhoneCall, gradient: 'from-blue-500 to-blue-600' },
  whatsapp: { icon: WhatsAppIcon, gradient: 'from-emerald-400 to-emerald-600' },
  instagram: { icon: Instagram, gradient: 'from-pink-500 via-purple-500 to-purple-600' },
  website: { icon: Globe, gradient: 'from-cyan-500 to-teal-500' },
  sms: { icon: MessageSquare, gradient: 'from-orange-400 to-orange-600' },
  voice: { icon: PhoneCall, gradient: 'from-blue-500 to-blue-600' },
  system: { icon: Settings, gradient: 'from-indigo-500 to-violet-600' },
};

// Ödeme yöntemleri — renkli zeminli ikon kutucukları (kontrol paneli "Hızlı İşlemler" tarzı canlı renkler)
const PAYMENT_META: Record<string, { label: string; icon: any; gradient: string }> = {
  iban: { label: 'IBAN Havale', icon: Banknote, gradient: 'from-emerald-500 to-green-600' },
  cod: { label: 'Kapıda Nakit', icon: HandCoins, gradient: 'from-orange-400 to-orange-600' },
  kapida_kart: { label: 'Kapıda Kart', icon: CreditCard, gradient: 'from-purple-500 to-violet-600' },
  website: { label: 'Link ile Ödeme', icon: CreditCard, gradient: 'from-pink-500 to-rose-600' },
  paytr: { label: 'Link ile Ödeme', icon: CreditCard, gradient: 'from-pink-500 to-rose-600' },
  iyzico: { label: 'Link ile Ödeme', icon: CreditCard, gradient: 'from-pink-500 to-rose-600' },
  link: { label: 'Link ile Ödeme', icon: CreditCard, gradient: 'from-pink-500 to-rose-600' },
  payment_link: { label: 'Link ile Ödeme', icon: CreditCard, gradient: 'from-pink-500 to-rose-600' },
};

// Sipariş durumları — renkli pill rozetler
const ORDER_STATUS_META: Record<string, { label: string; cls: string }> = {
  new: { label: 'Yeni', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  NEW: { label: 'Yeni', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  PAYMENT_WAITING: { label: 'Ödeme Bekleniyor', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  PACKAGING: { label: 'Hazırlanıyor', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' },
  PACKAGED: { label: 'Hazırlanıyor', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' },
  PREPARING: { label: 'Hazırlanıyor', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' },
  SHIPPED: { label: 'Kargoda', cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400' },
  shipped: { label: 'Kargoda', cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400' },
  DELIVERED: { label: 'Teslim Edildi', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  delivered: { label: 'Teslim Edildi', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  COMPLETED: { label: 'Teslim Edildi', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  completed: { label: 'Teslim Edildi', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  CANCELLED: { label: 'İptal', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' },
  cancelled: { label: 'İptal', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' },
};

function orderStatusMeta(status: string) {
  return ORDER_STATUS_META[String(status || '').toUpperCase()] || ORDER_STATUS_META.new;
}

// Kargo firma rozetleri
const CARGO_FIRMA_BADGE: Record<string, { label: string; short: string; cls: string }> = {
  yurtici: { label: 'Yurtiçi Kargo', short: 'YK', cls: 'bg-blue-600' },
  mng: { label: 'MNG Kargo', short: 'MNG', cls: 'bg-slate-700' },
  aras: { label: 'Aras Kargo', short: 'ARAS', cls: 'bg-red-600' },
  ptt: { label: 'PTT Kargo', short: 'PTT', cls: 'bg-orange-500' },
  surat: { label: 'Sürat Kargo', short: 'SÜRAT', cls: 'bg-purple-600' },
  dhl: { label: 'DHL', short: 'DHL', cls: 'bg-rose-600' },
};

function cargoFirmaBadge(company: string) {
  return CARGO_FIRMA_BADGE[String(company || '').toLowerCase()] || { label: 'Kargo', short: 'KG', cls: 'bg-slate-600' };
}

// Kargo aşama çubuğu adımları
const CARGO_STAGES = ['Gönderi Alındı', 'Yolda', 'Şubede', 'Dağıtımda', 'Teslim Edildi'];

function cargoStep(status: string): number {
  switch (String(status || '').toLowerCase()) {
    case 'pending': return 0;
    case 'in_transit': return 1;
    case 'at_branch': return 2;
    case 'out_for_delivery': return 3;
    case 'delivered': return 4;
    default: return 1;
  }
}

const CHANNEL_LABEL: Record<string, string> = {
  phone: 'Telefon', whatsapp: 'WhatsApp', instagram: 'Instagram', website: 'Web', sms: 'SMS', voice: 'Telefon', system: 'Sistem', panel: 'Panel',
  PHONE: 'Telefon', WHATSAPP: 'WhatsApp', INSTAGRAM: 'Instagram', WEBSITE: 'Web', SMS: 'SMS', VOICE: 'Telefon', SYSTEM: 'Sistem', PANEL: 'Panel',
};

// Ciro modalı — kanal bazlı ciro rozetleri (source meta)
const SOURCE_META: Record<string, { label: string; icon: ChannelIconType; gradient: string }> = {
  WHATSAPP: { label: 'WhatsApp', icon: WhatsAppIcon, gradient: 'from-emerald-500 to-green-600' },
  PHONE: { label: 'Telefon', icon: PhoneCall, gradient: 'from-blue-500 to-cyan-600' },
  SMS: { label: 'SMS', icon: MessageSquare, gradient: 'from-orange-500 to-orange-600' },
  INSTAGRAM: { label: 'Instagram DM', icon: Instagram, gradient: 'from-pink-500 via-purple-500 to-purple-600' },
  WEBSITE: { label: 'Web Sitesi', icon: Globe, gradient: 'from-cyan-500 to-teal-600' },
  PANEL: { label: 'Panel', icon: Settings, gradient: 'from-indigo-500 to-violet-600' },
};

function sourceMeta(source: string) {
  return SOURCE_META[String(source || '').toUpperCase()] || SOURCE_META.PHONE;
}

// Ciro modalı — ödeme yöntemi dağılım grupları (API paymentDistribution method key'leri)
const PAYMENT_DIST_META: Record<string, { label: string; gradient: string }> = {
  iban: { label: 'IBAN / Havale', gradient: 'from-emerald-500 to-green-600' },
  link: { label: 'Link ile Ödeme', gradient: 'from-pink-500 to-rose-600' },
  kapida_kart: { label: 'Kapıda Kredi Kartı', gradient: 'from-purple-500 to-violet-600' },
  cod: { label: 'Kapıda Nakit', gradient: 'from-orange-400 to-orange-600' },
};

function channelMeta(channel: string, source: string) {
  const key = String(channel || '').toLowerCase();
  return CHANNEL_COLORS[key] || CHANNEL_COLORS[String(source || '').toLowerCase()] || CHANNEL_COLORS.phone;
}

function channelLabel(channel: string, source: string) {
  const key = String(channel || '').toLowerCase();
  return CHANNEL_LABEL[key] || CHANNEL_LABEL[String(source || '').toUpperCase()] || CHANNEL_LABEL.phone;
}

function paymentMeta(method: string) {
  const m = String(method || '').toLowerCase();
  if (m.includes('kredi') || m === 'card') return PAYMENT_META.kapida_kart;
  if (m.includes('kapıda') || m.includes('nakit') || m.includes('cash') || m === 'cod') return PAYMENT_META.cod;
  return PAYMENT_META[m] || PAYMENT_META.iban;
}

// Kargo firma takip linkleri (statik)
const CARGO_TRACKING_URLS: Record<string, string> = {
  yurtici: 'https://gonderitakip.yurticikargo.com/',
  mng: 'https://app.mngkargo.com.tr/mngkargo/staticcontent/urun-takip/',
  aras: 'https://kargotakip.araskargo.com.tr/',
  ptt: 'https://gonderitakip.ptt.gov.tr/',
  surat: 'https://www.suratkargo.com.tr/KargoTakip',
  dhl: 'https://www.dhl.com/tr-tr/home/tracking.html',
};

const CARGO_STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Gönderi Alındı', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  PENDING: { label: 'Gönderi Alındı', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  in_transit: { label: 'Yolda', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  IN_TRANSIT: { label: 'Yolda', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  at_branch: { label: 'Şubede', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400' },
  AT_BRANCH: { label: 'Şubede', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400' },
  out_for_delivery: { label: 'Dağıtımda', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  OUT_FOR_DELIVERY: { label: 'Dağıtımda', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  delivered: { label: 'Teslim Edildi', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  DELIVERED: { label: 'Teslim Edildi', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  failed: { label: 'Teslim Sorunu', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' },
  FAILED: { label: 'Teslim Sorunu', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' },
};

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-sm ring-1 ring-inset ring-white/25',
  HIGH: 'bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-sm ring-1 ring-inset ring-white/25',
  NORMAL: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-sm ring-1 ring-inset ring-white/25',
  LOW: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm ring-1 ring-inset ring-white/25',
};

const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: 'Kritik', HIGH: 'Yüksek', NORMAL: 'Normal', LOW: 'Düşük',
};

// AI Hub kanalları — renkli zeminli ikon kutuları + beyaz ikonlar
const HUB_LEFT = [
  { name: 'Telefon', sub: 'Arama alınıyor', icon: Phone, iconBg: 'bg-blue-500', cardBorder: 'border-blue-200 dark:border-blue-500/40', glow: 'hover:shadow-blue-500/20', lineStroke: '#3b82f6' },
  { name: 'WhatsApp', sub: 'Mesaj alınıyor', icon: WhatsAppIcon, iconBg: 'bg-emerald-500', cardBorder: 'border-emerald-200 dark:border-emerald-500/40', glow: 'hover:shadow-emerald-500/20', lineStroke: '#10b981' },
  { name: 'Instagram DM', sub: 'DM alınıyor', icon: Instagram, iconBg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600', cardBorder: 'border-pink-200 dark:border-pink-500/40', glow: 'hover:shadow-pink-500/20', lineStroke: '#d946ef' },
];

const HUB_RIGHT = [
  { name: 'SMS', sub: 'Mesaj alınıyor', icon: MessageSquare, iconBg: 'bg-orange-500', cardBorder: 'border-orange-200 dark:border-orange-500/40', glow: 'hover:shadow-orange-500/20', lineStroke: '#f59e0b' },
  { name: 'Web Siteniz', sub: 'Sipariş alınıyor', icon: Globe, iconBg: 'bg-cyan-500', cardBorder: 'border-cyan-200 dark:border-cyan-500/40', glow: 'hover:shadow-cyan-500/20', lineStroke: '#06b6d4' },
];

const HUB_FEATURES = [
  { icon: ShoppingBag, text: 'Siparişleri alır', gradient: 'from-blue-500 to-cyan-600' },
  { icon: UserCheck, text: 'Müşterileri tanır', gradient: 'from-emerald-500 to-green-600' },
  { icon: HelpCircle, text: 'Soruları yanıtlar', gradient: 'from-violet-500 to-purple-600' },
  { icon: CreditCard, text: 'Ödemeyi yönetir', gradient: 'from-amber-500 to-orange-600' },
  { icon: Truck, text: 'Kargoyu takip eder', gradient: 'from-cyan-500 to-teal-600' },
  { icon: TrendingUp, text: 'İşletmenizi büyütür', gradient: 'from-pink-500 to-rose-600' },
];

function getCargoUrl(company: string, tracking: string): string {
  const base = CARGO_TRACKING_URLS[String(company || '').toLowerCase()] || CARGO_TRACKING_URLS.yurtici;
  if (!tracking) return base;
  return base;
}

// --- Ortak Modal ---
function Modal({ title, icon, onClose, children, wide, gradient = 'from-blue-600 to-indigo-600' }: { title: string; icon?: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean; gradient?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-16 overflow-y-auto" onClick={onClose}>
      <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-2xl'} animate-scale-in`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            {icon && <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${gradient} text-white flex items-center justify-center shadow-sm`}>{icon}</div>}
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

// --- Talep kartı (genişletilebilir açıklama) ---
function ComplaintCard({ c }: { c: Record<string, any> }) {
  const [open, setOpen] = useState(false);
  const ch = channelMeta(c.channel, c.channel);
  const ChIcon = ch.icon;
  const sevKey = SEVERITY_STYLES[String(c.severity)] ? String(c.severity) : 'NORMAL';
  const desc = String(c.description || '');
  const preview = desc.length > 130 ? desc.slice(0, 130) + '…' : desc;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 shadow-sm ring-1 ring-inset ring-white/25">
            <Ticket size={11} /> {c.ticket_number || 'Talep'}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold text-white px-2.5 py-1 rounded-lg bg-gradient-to-r ${ch.gradient} shadow-sm ring-1 ring-inset ring-white/25`}>
            <ChIcon size={11} /> {channelLabel(c.channel, c.channel)}
          </span>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${SEVERITY_STYLES[sevKey]}`}>{SEVERITY_LABEL[sevKey] || c.severity}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <UserPlus size={12} className="text-indigo-500" /> <b>{c.customer_name || 'Bilinmeyen Müşteri'}</b>
        {c.customer_phone && <><span>•</span> {c.customer_phone}</>}
        {c.customer_city && <><span>•</span> {c.customer_city}</>}
      </div>
      {c.customer_address && (
        <p className="flex items-center gap-1 text-xs text-slate-400">
          <MapPin size={11} className="text-pink-400" /> {c.customer_address}
        </p>
      )}
      <p className="text-xs text-slate-600 dark:text-slate-300">{open ? desc : preview}</p>
      {desc.length > 130 && (
        <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
          {open ? 'Daha Az Göster' : 'Devamını Gör'} <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        <a href={`/complaints?id=${c.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
          Detayları Gör <ChevronRight size={11} />
        </a>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [recent, setRecent] = useState<Record<string, unknown>[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const tid = getTenantId();

  // Modal state
  const [showTodayModal, setShowTodayModal] = useState(false);
  const [showCargoModal, setShowCargoModal] = useState(false);
  const [showComplaintsModal, setShowComplaintsModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [cargoFilter, setCargoFilter] = useState<'all' | 'in_transit' | 'pending' | 'branch' | 'out'>('all');

  // Toaster
  const [toast, setToast] = useState<string | null>(null);

  // Bağlantı çizgileri — kart ve logo konumları ölçülerek çizilir
  const gridRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const leftCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rightCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [hubLines, setHubLines] = useState<{ x0: number; y0: number; x1: number; y1: number; color: string }[]>([]);
  const [gridSize, setGridSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!mounted) return;
    const update = () => {
      const grid = gridRef.current;
      const coreEl = coreRef.current;
      if (!grid || !coreEl) return;
      const gr = grid.getBoundingClientRect();
      const cr = coreEl.getBoundingClientRect();
      const cx = cr.left + cr.width / 2 - gr.left;
      const cy = cr.top + cr.height / 2 - gr.top;
      const radius = cr.width / 2 + 26;
      const next: { x0: number; y0: number; x1: number; y1: number; color: string }[] = [];
      const connect = (el: HTMLDivElement | null, edgeFromLeft: boolean, color: string) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x0 = (edgeFromLeft ? r.right : r.left) - gr.left;
        const y0 = r.top + r.height / 2 - gr.top;
        const dx = cx - x0;
        const dy = cy - y0;
        const dist = Math.hypot(dx, dy) || 1;
        next.push({ x0, y0, x1: cx - (dx / dist) * radius, y1: cy - (dy / dist) * radius, color });
      };
      HUB_LEFT.forEach((ch, i) => connect(leftCardRefs.current[i], true, ch.lineStroke));
      HUB_RIGHT.forEach((ch, i) => connect(rightCardRefs.current[i], false, ch.lineStroke));
      setHubLines(next);
      setGridSize({ w: gr.width, h: gr.height });
    };
    update();
    const t = setTimeout(update, 150);
    window.addEventListener('resize', update);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && gridRef.current) {
      ro = new ResizeObserver(update);
      ro.observe(gridRef.current);
    }
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, [mounted]);

  const loadDashboard = async () => {
    try {
      const [d, tl, h] = await Promise.all([
        fetch(`/api/dashboard/${tid}`).then(r => r.json()),
        fetch(`/api/timeline/recent/${tid}`).then(r => r.json()),
        fetch(`/api/health/${tid}`).then(r => r.json()).catch(() => ({})),
      ]);
      setStats({ ...d, ...h });
      setRecent(Array.isArray(tl) ? tl : []);
      setTimeout(() => setLoaded(true), 50);
    } catch { /* sessiz */ }
  };

  useEffect(() => {
    setMounted(true);
    loadDashboard();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const today = stats.today as Record<string, unknown> || {};
  const totalOrders = (stats.todayOrders as number) ?? 37;
  const todayRevenue = Number(stats.todayRevenue ?? 28760);
  const aiSuccessRate = (stats.aiSuccessRate as number) ?? (today.aiSuccessRate as number) ?? 97;
  const aiRevenue = Number(stats.aiRevenue ?? 24800);
  const aiCustomers = Number(stats.aiCustomers ?? 15);
  const cargoTracking = Number(stats.cargoTracking ?? 3);
  const rawComplaints = stats.complaints24h;
  const complaints24h = Array.isArray(rawComplaints) ? (rawComplaints as Record<string, any>[]) : [];
  const complaintsCount = Array.isArray(rawComplaints) ? complaints24h.length : 5;
  const todayOrdersList = (stats.todayOrdersList as Record<string, any>[]) || [];
  const cargoAllList = (stats.cargoTrackingList as Record<string, any>[]) || [];

  const channelRevenue = (stats.channelRevenue as Record<string, any>[]) || [];
  const paymentDistribution = (stats.paymentDistribution as Record<string, any>[]) || [];
  const approvedRevenue = Number(stats.approvedRevenue ?? 0);
  const pendingApprovalRevenue = Number(stats.pendingApprovalRevenue ?? 0);
  const cargoCollectionRevenue = Number(stats.cargoCollectionRevenue ?? 0);
  const approvedCount = Number(stats.approvedCount ?? 0);
  const pendingApprovalCount = Number(stats.pendingApprovalCount ?? 0);
  const cargoCollectionCount = Number(stats.cargoCollectionCount ?? 0);
  const yesterdayRevenue = Number(stats.yesterdayRevenue ?? 0);
  const revenueChangePct = Number(stats.revenueChangePct ?? 0);
  const ordersChangePct = Number(stats.ordersChangePct ?? 0);
  const avgBasketChangePct = Number(stats.avgBasketChangePct ?? 0);
  const websiteEnabled = Boolean(stats.websiteEnabled ?? true);

  const cargoFilteredList = cargoAllList.filter((o) => {
    if (cargoFilter === 'in_transit') return String(o.cargo_status).toLowerCase() === 'in_transit';
    if (cargoFilter === 'pending') return String(o.cargo_status).toLowerCase() === 'pending';
    if (cargoFilter === 'branch') return String(o.cargo_status).toLowerCase() === 'at_branch';
    if (cargoFilter === 'out') return String(o.cargo_status).toLowerCase() === 'out_for_delivery';
    return true;
  });

  // Takip numarasını panoya kopyala
  const copyTracking = (text: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text)
      .then(() => setToast('Takip numarası kopyalandı 📋'))
      .catch(() => {});
  };

  // Firma takip sayfasını panelin üzerinde küçük pencerede açar (engellenirse yeni sekme)
  const openCargoSite = (company: string, tracking: string) => {
    const url = getCargoUrl(company, tracking);
    const win = window.open(url, '_blank', 'width=640,height=720,popup=yes');
    if (!win) window.open(url, '_blank', 'noreferrer');
  };

  const totalRevenue = Number(stats.totalRevenue ?? 24800);
  const totalCustomers = Number(stats.totalCustomers ?? 126);

  const kpis = [
    { label: 'Bugünkü Sipariş', value: totalOrders, icon: ShoppingCart, gradient: 'from-blue-500 to-cyan-600', cardBorder: 'border-blue-200 dark:border-blue-500/40', trend: '↑ %19', onClick: () => setShowTodayModal(true) },
    { label: 'Kargo Takibi', value: cargoTracking, icon: Truck, gradient: 'from-amber-500 to-orange-600', cardBorder: 'border-amber-200 dark:border-amber-500/40', trend: '↑ %12', onClick: () => setShowCargoModal(true) },
    { label: 'Talep & İstek', value: complaintsCount, icon: AlertCircle, gradient: 'from-pink-500 to-rose-600', cardBorder: 'border-pink-200 dark:border-pink-500/40', trend: '↑ %14', onClick: () => setShowComplaintsModal(true) },
    { label: 'Bugünkü Ciro', value: todayRevenue, icon: Wallet, gradient: 'from-emerald-500 to-green-600', cardBorder: 'border-emerald-200 dark:border-emerald-500/40', trend: '↑ %22', suffix: ' TL', onClick: () => setShowRevenueModal(true) },
    { label: 'AI Müşteri', value: aiCustomers, icon: User, gradient: 'from-purple-500 to-violet-600', cardBorder: 'border-purple-200 dark:border-purple-500/40', trend: '↑ %33' },
    { label: 'AI Satış', value: aiRevenue, icon: TrendingUp, gradient: 'from-indigo-500 to-blue-600', cardBorder: 'border-blue-200 dark:border-blue-500/40', trend: '↑ %28', suffix: ' TL' },
    { label: 'AI Başarı', value: 97, icon: Target, gradient: 'from-teal-500 to-emerald-600', cardBorder: 'border-emerald-200 dark:border-emerald-500/40', trend: '↑ %4', suffix: '%' },
  ];

  if (!mounted) return <div className="p-6" />;

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-4rem)] lg:min-h-screen bg-gradient-to-tr from-[#F1F5F9] via-[#F8FAFC] to-[#EFF6FF] dark:from-[#020410] dark:via-[#05081C] dark:to-[#0A0E2E] text-slate-900 dark:text-white px-4 md:px-8 pt-1 md:pt-2 pb-4 md:pb-8 space-y-8 w-full animate-fade-in">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-100/70 dark:bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-100/60 dark:bg-purple-600/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-cyan-100/50 dark:bg-cyan-500/10 blur-3xl" />

      <div className="relative z-10 space-y-8">
        {/* Marka bloğu — logo + slogan */}
        <div className="flex items-center gap-3">
          <img src="/logo2.png" alt="SiparişAsistanı" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-violet-600 via-fuchsia-500 to-blue-600 dark:from-violet-400 dark:via-fuchsia-400 dark:to-blue-400 bg-clip-text text-transparent">SiparişAsistanı</h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Akıllı Sipariş, Güçlü İşletme.</p>
          </div>
        </div>

        {/* AI Orchestration Hub — Müşterileriniz Nerede Olursa Olsun */}
        <div className="text-left">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Müşterileriniz Nerede Olursa Olsun
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">
            Yapay zeka, tüm kanallardan gelen siparişleri sizin için yönetir.
          </p>
        </div>

        {/* Orkestrasyon alanı — yüzen kartlar + bağlantı hatları */}
        <div ref={gridRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-4 items-center relative">
          {/* Sol kanallar */}
          <div className="lg:col-span-3 flex flex-row lg:flex-col gap-3 flex-wrap justify-center lg:justify-start lg:items-end z-10">
            {HUB_LEFT.map((ch, i) => {
              const ChIcon = ch.icon;
              return (
                <div key={ch.name} ref={(el) => { leftCardRefs.current[i] = el; }} className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-indigo-950/40 border ${ch.cardBorder} shadow-[0_4px_25px_rgba(0,0,0,0.03)] dark:shadow-[0_0_15px_rgba(99,102,241,0.1)] ${ch.glow} hover:shadow-lg transition-all w-56 max-w-[15rem]`}>
                  <div className={`w-11 h-11 rounded-xl ${ch.iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
                    <ChIcon size={22} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{ch.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{ch.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Merkez AI Çekirdek */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center gap-6 z-10 py-6">
            <div className="relative">
              <div className="absolute inset-[-28px] rounded-full border border-fuchsia-200/70 dark:border-fuchsia-400/10" />
              <div className="absolute inset-[-15px] rounded-full border border-fuchsia-300/50 dark:border-fuchsia-400/20" />
              <div ref={coreRef} className="relative w-40 h-40 md:w-48 md:h-48 rounded-full bg-white dark:bg-[#0C1027] border border-slate-100/80 dark:border-indigo-500/40 shadow-[0_4px_40px_rgba(99,102,241,0.12)] dark:shadow-[0_0_40px_rgba(168,85,247,0.35)] flex items-center justify-center">
                <div className="absolute inset-[-8px] rounded-full border-2 border-fuchsia-400 dark:border-fuchsia-500/40 animate-ping [animation-duration:3s]" />
                <img src="/logo2.png" alt="AI Çekirdek" className="w-20 h-20 md:w-24 md:h-24 object-contain dark:drop-shadow-[0_0_20px_rgba(99,102,241,0.85)]" />
              </div>
            </div>
            <div className="rounded-full bg-white/95 dark:bg-[#0C1027]/80 border border-indigo-500/50 dark:border-indigo-400/60 shadow-md dark:shadow-[0_0_20px_rgba(99,102,241,0.3)] px-6 py-2 flex items-baseline gap-2">
              <span className="text-xs font-bold text-indigo-600 dark:text-cyan-400 tracking-wide">AI Aktif</span>
              <span className="text-lg font-extrabold text-indigo-700 dark:text-indigo-400 tabular-nums">%97</span>
            </div>
          </div>

          {/* Sağ kanallar */}
          <div className="lg:col-span-2 flex flex-row sm:flex-col gap-3 flex-wrap justify-center sm:justify-start z-10">
            {HUB_RIGHT.map((ch, i) => {
              const ChIcon = ch.icon;
              return (
                <div key={ch.name} ref={(el) => { rightCardRefs.current[i] = el; }} className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-indigo-950/40 border ${ch.cardBorder} shadow-[0_4px_25px_rgba(0,0,0,0.03)] dark:shadow-[0_0_15px_rgba(99,102,241,0.1)] ${ch.glow} hover:shadow-lg transition-all w-56 sm:w-full max-w-[15rem]`}>
                  <div className={`w-11 h-11 rounded-xl ${ch.iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
                    <ChIcon size={22} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{ch.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{ch.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Özellik Paneli (Glassmorphism) */}
          <div className="lg:col-span-3 flex justify-center lg:justify-end items-stretch z-10">
            <div className="rounded-2xl bg-white/90 dark:bg-[#0C1027]/60 border border-violet-200/80 dark:border-violet-500/40 backdrop-blur-md shadow-[0_4px_25px_rgba(0,0,0,0.04)] dark:shadow-2xl p-4 flex flex-col justify-center gap-3 w-full max-w-[15rem] h-full lg:min-h-[24rem]">
              {HUB_FEATURES.map((f) => {
                const FIcon = f.icon;
                return (
                  <div key={f.text} className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${f.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                      <FIcon size={15} className="text-white" />
                    </span>
                    {f.text}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ölçüme dayalı bağlantı hatları — kart kenarından logo dış halkasına */}
          <svg className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none" width={gridSize.w} height={gridSize.h} viewBox={`0 0 ${gridSize.w} ${gridSize.h}`} fill="none">
            {hubLines.map((l, i) => (
              <g key={i}>
                <path
                  d={`M ${l.x0} ${l.y0} C ${(l.x0 + l.x1) / 2} ${l.y0}, ${(l.x0 + l.x1) / 2} ${l.y1}, ${l.x1} ${l.y1}`}
                  stroke={l.color}
                  strokeWidth="2"
                  className="opacity-50 dark:opacity-70"
                />
                <circle cx={l.x0} cy={l.y0} r="4.5" fill={l.color} stroke="white" strokeWidth="2" />
                <circle cx={l.x1} cy={l.y1} r="4.5" fill={l.color} className="animate-pulse" />
              </g>
            ))}
          </svg>
        </div>

        {/* 7 KPI — tek sıra */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {!loaded ? Array.from({ length: 7 }).map((_, i) => <SkeletonKPI key={i} />) : kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <button
                key={kpi.label}
                onClick={kpi.onClick}
                className={`group bg-white dark:bg-[#0C1027]/40 border ${kpi.cardBorder} rounded-2xl p-4 shadow-[0_4px_15px_rgba(0,0,0,0.02)] dark:shadow-2xl hover:shadow-md dark:hover:shadow-indigo-500/10 transition-all ${kpi.onClick ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon size={17} className="text-white" />
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{kpi.label}</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white text-center mb-2 tabular-nums">
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
          <div className="rounded-2xl bg-white dark:bg-[#0C1027] border border-violet-200/80 dark:border-violet-500/40 shadow-sm dark:shadow-xl p-5 space-y-3">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Zap size={14} className="text-amber-500" /> Hızlı İşlemler
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { href: '/orders', label: 'Siparişler', icon: ShoppingBag, gradient: 'from-blue-500 to-cyan-600', cardBorder: 'border-blue-200 dark:border-blue-500/40' },
                { href: '/customers', label: 'Müşteriler', icon: Users, gradient: 'from-emerald-500 to-green-600', cardBorder: 'border-emerald-200 dark:border-emerald-500/40' },
                { href: '/products', label: 'Ürünler', icon: Package, gradient: 'from-amber-500 to-orange-600', cardBorder: 'border-amber-200 dark:border-amber-500/40' },
                { href: '/calls', label: 'Görüşmeler', icon: PhoneCall, gradient: 'from-cyan-500 to-teal-600', cardBorder: 'border-cyan-200 dark:border-cyan-500/40' },
                { href: '/complaints', label: 'Talepler', icon: AlertTriangle, gradient: 'from-rose-500 to-pink-600', cardBorder: 'border-rose-200 dark:border-rose-500/40' },
                { href: '/reports', label: 'Raporlar', icon: TrendingUp, gradient: 'from-violet-500 to-purple-600', cardBorder: 'border-violet-200 dark:border-violet-500/40' },
              ].map((item) => {
                const QaIcon = item.icon;
                return (
                  <a key={item.href} href={item.href}
                    className={`flex items-center gap-2 px-3 py-3 rounded-xl bg-white dark:bg-white/5 border ${item.cardBorder} shadow-sm hover:shadow-md dark:hover:shadow-indigo-500/10 transition-all`}>
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                      <QaIcon size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-2xl bg-white dark:bg-[#0C1027] border border-violet-200/80 dark:border-violet-500/40 shadow-sm dark:shadow-xl p-5">
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
        <Modal title="Bugünkü Siparişler" icon={<ShoppingCart size={15} />} gradient="from-blue-500 to-cyan-600" onClose={() => setShowTodayModal(false)} wide>
          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {(todayOrdersList.length > 0 ? todayOrdersList : [
              { id: 'demo-1', order_number: '26-00001', total_price: 1780, status: 'new', channel: 'phone', payment_method: 'iban', customer_name: 'Zafer Ayyıldız', customer_phone: '05321234567', customer_city: 'Afyonkarahisar', customer_address: 'Atatürk Cad. No:42', created_at: new Date().toISOString(), items: [{ product_name: 'Dana Parmak Sucuk', quantity: 2, unit: 'KG', total: 1780 }] },
              { id: 'demo-2', order_number: '26-00002', total_price: 4500, status: 'PAYMENT_WAITING', channel: 'whatsapp', payment_method: 'Kapıda Nakit', customer_name: 'Mehmet Öztürk', customer_phone: '05339876543', customer_city: 'Afyonkarahisar', customer_address: 'Zafer Mah.', created_at: new Date().toISOString(), items: [{ product_name: 'Pastırma', quantity: 3, unit: 'KG', total: 3600 }, { product_name: 'Dana Parmak Sucuk', quantity: 1, unit: 'KG', total: 890 }] },
              { id: 'demo-3', order_number: '26-00003', total_price: 6800, status: 'PACKAGING', channel: 'instagram', payment_method: 'Kapıda Kredi Kartı', customer_name: 'Ayşe Demir', customer_phone: '05351234455', customer_city: 'İzmir', customer_address: 'Alsancak Mah. No:7', created_at: new Date().toISOString(), items: [{ product_name: 'Köy Yumurtası', quantity: 10, unit: 'KOLİ', total: 6500 }, { product_name: 'Kaymak', quantity: 1, unit: 'KG', total: 300 }] },
              { id: 'demo-4', order_number: '26-00004', total_price: 920, status: 'SHIPPED', channel: 'website', payment_method: 'paytr', customer_name: 'Ali Kaya', customer_phone: '05411223344', customer_city: 'İstanbul', customer_address: 'Kadıköy, Moda Cad. No:15', created_at: new Date().toISOString(), items: [{ product_name: 'Dana Sucuk', quantity: 1, unit: 'KG', total: 920 }] },
              { id: 'demo-5', order_number: '26-00005', total_price: 2650, status: 'new', channel: 'sms', payment_method: 'havale', customer_name: 'Fatma Şahin', customer_phone: '05051239876', customer_city: 'Ankara', customer_address: 'Çankaya, Kızılay Mah.', created_at: new Date().toISOString(), items: [{ product_name: 'Çiğköfte (Karışık)', quantity: 5, unit: 'KG', total: 2650 }] },
              { id: 'demo-6', order_number: '26-00006', total_price: 3990, status: 'DELIVERED', channel: 'panel', payment_method: 'iyzico', customer_name: 'Hatice Çelik', customer_phone: '05328765432', customer_city: 'Ankara', customer_address: 'Keçiören, Fatih Mah. No:8', created_at: new Date().toISOString(), items: [{ product_name: 'Bükme (Patatesli)', quantity: 6, unit: 'TEPİ', total: 3600 }, { product_name: 'Haşhaş Ezmesi', quantity: 1, unit: 'KG', total: 390 }] },
            ]).map((o) => {
              const sm = orderStatusMeta(o.status);
              return (
              <div key={o.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">#{o.order_number}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span>
                    <span className="text-xs text-slate-400">{new Date(o.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{Number(o.total_price).toLocaleString('tr-TR')} TL</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const ch = channelMeta(o.channel, o.source);
                    const ChIcon = ch.icon;
                    const pm = paymentMeta(o.payment_method);
                    const PmIcon = pm.icon;
                    return (
                      <>
                        <span className={`inline-flex items-center gap-1 text-xs font-bold text-white px-2 py-1 rounded-lg bg-gradient-to-r ${ch.gradient}`}>
                          <ChIcon size={11} /> {channelLabel(o.channel, o.source)}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs font-bold text-white px-2 py-1 rounded-lg bg-gradient-to-r ${pm.gradient}`}>
                          <PmIcon size={11} /> {pm.label}
                        </span>
                      </>
                    );
                  })()}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <UserPlus size={12} className="text-indigo-500" /> <b>{o.customer_name}</b>
                  <span>•</span> {o.customer_phone}
                  {o.customer_city && <><span>•</span> {o.customer_city}</>}
                </div>
                {o.customer_address && (
                  <p className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin size={11} className="text-cyan-500" /> {o.customer_address}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {(o.items || []).map((it: any, idx: number) => (
                    <span key={idx} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {it.product_name} × {it.quantity} {it.unit || ''}
                    </span>
                  ))}
                </div>
              </div>
              );
            })}
            {todayOrdersList.length === 0 && <div className="py-8 text-center text-xs text-slate-400">Bugün henüz sipariş yok</div>}
          </div>
        </Modal>
      )}

      {/* Modal: Kargo Takibi (yolda olan siparişler) */}
      {showCargoModal && (
        <Modal title="Kargo Takibi" icon={<Truck size={15} />} gradient="from-amber-500 to-orange-600" onClose={() => setShowCargoModal(false)} wide>
          <div className="mb-3 flex items-start gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs text-slate-600 dark:text-slate-300">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-sm"><Truck size={13} /></span>
            <p>Kargoya verilen siparişler anlık takip edilir. Müşteriye teslim edilen kargolar <b>listeden otomatik olarak kaldırılır</b>.</p>
          </div>
          {/* Filtre sekmeleri */}
          <div className="mb-3 flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            {([
              { key: 'all', label: 'Tüm Kargolar', count: cargoAllList.length },
              { key: 'in_transit', label: 'Yolda', count: cargoAllList.filter((o) => String(o.cargo_status).toLowerCase() === 'in_transit').length },
              { key: 'pending', label: 'Aktarım Merkezinde', count: cargoAllList.filter((o) => String(o.cargo_status).toLowerCase() === 'pending').length },
              { key: 'branch', label: 'Şubede', count: cargoAllList.filter((o) => String(o.cargo_status).toLowerCase() === 'at_branch').length },
              { key: 'out', label: 'Dağıtımdakiler', count: cargoAllList.filter((o) => String(o.cargo_status).toLowerCase() === 'out_for_delivery').length },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCargoFilter(tab.key)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${cargoFilter === tab.key ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60'}`}>
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cargoFilter === tab.key ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {(cargoAllList.length > 0 ? cargoFilteredList : [
              { id: 'demo-p1', order_number: '26-00004', total_price: 15600, status: 'SHIPPED', customer_name: 'Hatice Çelik', customer_phone: '05328765432', customer_city: 'Ankara', cargo_company: 'ptt', tracking_number: 'PTT12345', cargo_status: 'pending', items: [{ product_name: 'Bükme (Patatesli)', quantity: 12, unit: 'TEPİ', total: 7200 }, { product_name: 'Haşhaş Ezmesi', quantity: 20, unit: 'KG', total: 8400 }] },
              { id: 'demo-p2', order_number: '26-00006', total_price: 3200, status: 'SHIPPED', customer_name: 'Mustafa Öztürk', customer_phone: '05551234567', customer_city: 'Afyonkarahisar', cargo_company: 'surat', tracking_number: 'SUR1234', cargo_status: 'in_transit', items: [{ product_name: 'Dana Parmak Sucuk', quantity: 2, unit: 'KG', total: 1780 }, { product_name: 'Pastırma', quantity: 1, unit: 'KG', total: 1200 }] },
              { id: 'demo-p3', order_number: '26-00008', total_price: 6800, status: 'SHIPPED', customer_name: 'Ayşe Demir', customer_phone: '05339876543', customer_city: 'İzmir', cargo_company: 'yurtici', tracking_number: 'YT11223344', cargo_status: 'out_for_delivery', items: [{ product_name: 'Köy Yumurtası', quantity: 10, unit: 'KOLİ', total: 6500 }, { product_name: 'Kaymak', quantity: 1, unit: 'KG', total: 300 }] },
            ]).map((o) => {
              const cMeta = CARGO_STATUS_META[String(o.cargo_status || '')] || CARGO_STATUS_META.IN_TRANSIT;
              const badge = cargoFirmaBadge(o.cargo_company);
              const step = cargoStep(o.cargo_status);
              return (
                <div key={o.id} className="rounded-xl border border-amber-200/70 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-9 h-9 rounded-xl ${badge.cls} text-white flex items-center justify-center text-xs font-black shadow-sm`}>{badge.short}</span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">#{o.order_number}</span>
                          {o.tracking_number && (
                            <button onClick={() => copyTracking(o.tracking_number)} title="Takip numarasını kopyala"
                              className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5 hover:border-amber-300 hover:text-amber-600 transition-colors">
                              {o.tracking_number} <Copy size={11} className="text-amber-500" />
                            </button>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">{badge.label}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cMeta.cls}`}>{cMeta.label}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{Number(o.total_price).toLocaleString('tr-TR')} TL</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <UserPlus size={13} className="text-indigo-500" /> <b>{o.customer_name}</b>
                    <span>•</span> {o.customer_phone}
                    {o.customer_city && <><span>•</span> {o.customer_city}</>}
                  </div>
                  {/* Aşama çubuğu */}
                  <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      {CARGO_STAGES.map((s, i) => (
                        <span key={s} className={i <= step ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}>{s}</span>
                      ))}
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all" style={{ width: `${((step + 1) / CARGO_STAGES.length) * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(o.items || []).map((it: any, idx: number) => (
                      <span key={idx} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        {it.product_name} × {it.quantity} {it.unit || ''}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => openCargoSite(o.cargo_company, o.tracking_number)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-xs font-bold shadow-sm hover:shadow-md hover:brightness-110 transition-all">
                      <ExternalLink size={12} /> Kargo Takip
                    </button>
                  </div>
                </div>
              );
            })}
            {cargoAllList.length > 0 && cargoFilteredList.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">Bu filtrede kargo bulunmuyor</div>
            )}
            {cargoAllList.length === 0 && <div className="py-8 text-center text-xs text-slate-400">Kargoda sipariş yok 🎉</div>}
          </div>
        </Modal>
      )}

      {/* Modal: Talep & İstek */}
      {showComplaintsModal && (
        <Modal title="Son 24 Saat Talepleri" icon={<AlertCircle size={15} />} gradient="from-pink-500 to-rose-600" onClose={() => setShowComplaintsModal(false)} wide>
          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {(complaints24h.length > 0 ? complaints24h : [
              { id: 'c1', event_type: 'COMPLAINT_OPEN', description: 'Ürünlerin son kullanma tarihi geçmiş', channel: 'whatsapp', severity: 'CRITICAL', ticket_number: 'TKT-0001', created_at: new Date().toISOString(), customer_name: 'Hatice Çelik', customer_phone: '05328765432', customer_city: 'Ankara', customer_address: 'Keçiören, Fatih Mah. No:8' },
              { id: 'c2', event_type: 'COMPLAINT_OPEN', description: 'İade talebinde bulundu', channel: 'phone', severity: 'HIGH', ticket_number: 'TKT-0002', created_at: new Date().toISOString(), customer_name: 'Mehmet Öztürk', customer_phone: '05339876543', customer_city: 'Afyonkarahisar', customer_address: 'Zafer Mah.' },
            ]).map((c) => <ComplaintCard key={c.id} c={c} />)}
            {complaints24h.length === 0 && <div className="py-8 text-center text-xs text-slate-400">Son 24 saatte talep yok</div>}
          </div>
        </Modal>
      )}

      {/* Modal: Bugünkü Ciro & Satış Detayları */}
      {showRevenueModal && (
        <Modal title="Bugünkü Ciro & Satış Detayları" icon={<Wallet size={15} />} gradient="from-emerald-500 to-green-600" onClose={() => setShowRevenueModal(false)} wide>
          <div className="space-y-4">
            {/* Metrik özet kutuları */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-blue-200/70 dark:border-blue-500/30 p-5 text-center">
                <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow-md mb-2">
                  <ShoppingCart size={15} />
                </div>
                <p className="text-xs font-bold text-blue-700 dark:text-blue-400">Bugünkü Sipariş</p>
                <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1.5 tabular-nums">{todayOrdersList.length} <span className="text-sm font-bold">adet</span></p>
                <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ring-1 ring-inset ring-white/25 shadow-sm ${ordersChangePct >= 0 ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' : 'bg-gradient-to-r from-rose-500 to-red-600 text-white'}`}>
                  {ordersChangePct >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />} %{Math.abs(ordersChangePct)} <span className="opacity-80 font-bold">Düne Göre</span>
                </div>
                <p className="text-[10px] text-blue-500/60 dark:text-blue-300/50 mt-2">Bugün oluşturulan sipariş sayısı (00:00 sonrası)</p>
              </div>
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/70 dark:border-emerald-500/30 p-5 text-center">
                <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-tr from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-md mb-2">
                  <Wallet size={15} />
                </div>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Bugünkü Ciro</p>
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 tabular-nums">{Number(todayRevenue).toLocaleString('tr-TR')} <span className="text-sm font-bold">TL</span></p>
                <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ring-1 ring-inset ring-white/25 shadow-sm ${revenueChangePct >= 0 ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' : 'bg-gradient-to-r from-rose-500 to-red-600 text-white'}`}>
                  {revenueChangePct >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />} %{Math.abs(revenueChangePct)} <span className="opacity-80 font-bold">Düne Göre</span>
                </div>
                <p className="text-[10px] text-emerald-500/60 dark:text-emerald-300/50 mt-2">Bugünkü siparişlerin toplam tutarı</p>
              </div>
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-teal-200/70 dark:border-teal-500/30 p-5 text-center">
                <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-600 text-white flex items-center justify-center shadow-md mb-2">
                  <TrendingUp size={15} />
                </div>
                <p className="text-xs font-bold text-teal-700 dark:text-teal-400">Ortalama Sepet</p>
                <p className="text-3xl font-black text-teal-600 dark:text-teal-400 mt-1.5 tabular-nums">
                  {todayOrdersList.length > 0 ? Math.round(todayRevenue / todayOrdersList.length).toLocaleString('tr-TR') : 0} <span className="text-sm font-bold">TL</span>
                </p>
                <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ring-1 ring-inset ring-white/25 shadow-sm ${avgBasketChangePct >= 0 ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' : 'bg-gradient-to-r from-rose-500 to-red-600 text-white'}`}>
                  {avgBasketChangePct >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />} %{Math.abs(avgBasketChangePct)} <span className="opacity-80 font-bold">Düne Göre</span>
                </div>
                <p className="text-[10px] text-teal-500/60 dark:text-teal-300/50 mt-2">Ciro ÷ sipariş sayısı (sipariş başına ortalama)</p>
              </div>
            </div>

            {/* Kanal bazlı ciro */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Kanal Bazlı Ciro</p>
                <p className="text-xs font-black text-slate-700 dark:text-slate-300 tabular-nums">{channelRevenue.reduce((s, c) => s + Number(c.total || 0), 0).toLocaleString('tr-TR')} TL</p>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {channelRevenue.map((c) => {
                  const cm = sourceMeta(c.source);
                  const share = todayRevenue > 0 ? Math.round((Number(c.total || 0) / todayRevenue) * 100) : 0;
                  return (
                    <div key={c.source} className="flex flex-col items-center gap-0.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold text-white px-2.5 py-1.5 rounded-full bg-gradient-to-r ${cm.gradient} shadow-sm ring-1 ring-inset ring-white/25`}>
                        <cm.icon size={13} />
                        {cm.label}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 tabular-nums">{Number(c.total || 0).toLocaleString('tr-TR')} TL · <span className="text-slate-400">%{share}</span></span>
                    </div>
                  );
                })}
                {channelRevenue.length === 0 && <p className="text-xs text-slate-400">Bugün satış kaydı yok</p>}
              </div>
            </div>

            {/* Ödeme yöntemi dağılımı */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Ödeme Yöntemi Dağılımı</p>
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                {paymentDistribution.map((p) => {
                  const pm = PAYMENT_DIST_META[p.method] || PAYMENT_DIST_META.iban;
                  return (
                    <div key={p.method} title={`${pm.label}: ${Number(p.total || 0).toLocaleString('tr-TR')} TL`}
                      className={`h-full bg-gradient-to-r ${pm.gradient} transition-all`}
                      style={{ width: `${todayRevenue > 0 ? Math.max(1, (Number(p.total || 0) / todayRevenue) * 100) : 0}%` }} />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {paymentDistribution.map((p) => {
                  const pm = PAYMENT_DIST_META[p.method] || PAYMENT_DIST_META.iban;
                  const share = todayRevenue > 0 ? Math.round((Number(p.total || 0) / todayRevenue) * 100) : 0;
                  return (
                    <div key={p.method} className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-tr ${pm.gradient}`} />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{pm.label}</span>
                      <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{Number(p.total || 0).toLocaleString('tr-TR')} TL</span>
                      <span className="text-[10px] text-slate-400 font-medium">· %{share}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tahsilat & Onay Durumu */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Tahsilat & Onay Durumu</p>
              <div className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 px-3 py-2.5">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-green-600 text-white flex items-center justify-center shrink-0 shadow-sm"><CheckCircle2 size={14} /></span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Hesaba Geçen / Onaylı Ciro</p>
                  <p className="text-[10px] text-emerald-600/70 dark:text-emerald-300/70">IBAN, Link ve Webhook ile anında onaylanan siparişler</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 tabular-nums">{approvedRevenue.toLocaleString('tr-TR')} TL</p>
                  <p className="text-[10px] text-emerald-600/70 dark:text-emerald-300/70">{approvedCount} sipariş</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 px-3 py-2.5">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm"><Truck size={14} /></span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Kargo Tahsilatında Bekleyen Ciro</p>
                  <p className="text-[10px] text-amber-600/70 dark:text-amber-300/70">Kargoya verildi, teslimatta tahsil edilecek (Kapıda Nakit / Kart)</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-amber-700 dark:text-amber-400 tabular-nums">{cargoCollectionRevenue.toLocaleString('tr-TR')} TL</p>
                  <p className="text-[10px] text-amber-600/70 dark:text-amber-300/70">{cargoCollectionCount} sipariş</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-400 to-slate-500 text-white flex items-center justify-center shrink-0 shadow-sm"><Clock size={14} /></span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Onay Bekleyen Ciro</p>
                  <p className="text-[10px] text-slate-400">Dekont bekleyen IBAN / ödeme bekleyen siparişler</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-600 dark:text-slate-300 tabular-nums">{pendingApprovalRevenue.toLocaleString('tr-TR')} TL</p>
                  <p className="text-[10px] text-slate-400">{pendingApprovalCount} sipariş</p>
                </div>
              </div>
              {yesterdayRevenue > 0 && (
                <p className="text-[10px] text-slate-400 pt-1">Dün aynı saat dilimi: <b>{yesterdayRevenue.toLocaleString('tr-TR')} TL</b></p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}