'use client';

import React, { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, AlertTriangle, Bot, CheckCircle2, ChevronRight, PhoneCall, Settings, Clock, User, Hash, Phone, Instagram, MapPin, MessageSquare, StickyNote, Package, Banknote, ShoppingBag, Shield, Sparkles, Crown, CalendarClock } from 'lucide-react';
import { WhatsAppIcon, ChannelIconType } from '@/components/channel-icons';

const SEVERITY_CONFIG: Record<string, { label: string; gradient: string }> = {
  LOW: { label: 'Düşük', gradient: 'from-emerald-400 to-teal-500' },
  NORMAL: { label: 'Normal', gradient: 'from-amber-400 to-orange-500' },
  HIGH: { label: 'Yüksek', gradient: 'from-orange-500 to-red-500' },
  CRITICAL: { label: 'Kritik', gradient: 'from-red-500 to-rose-600' },
};

const CHANNEL_LABELS: Record<string, string> = {
  VOICE: 'Sesli', WHATSAPP: 'WhatsApp', PHONE: 'Telefon', INSTAGRAM: 'Instagram', SISTEM: 'Sistem',
  voice: 'Sesli', whatsapp: 'WhatsApp', phone: 'Telefon', instagram: 'Instagram', sms: 'SMS', web: 'Web',
};

const CHANNEL_ICONS: Record<string, ChannelIconType> = {
  VOICE: PhoneCall, WHATSAPP: WhatsAppIcon, PHONE: PhoneCall, INSTAGRAM: Instagram, SISTEM: Settings,
  voice: PhoneCall, whatsapp: WhatsAppIcon, phone: PhoneCall, instagram: Instagram, sms: MessageSquare,
};

const CHANNEL_GRADIENT: Record<string, string> = {
  VOICE: 'from-blue-500 to-blue-600', WHATSAPP: 'from-emerald-400 to-emerald-600',
  PHONE: 'from-blue-500 to-blue-600', INSTAGRAM: 'from-pink-500 via-purple-500 to-purple-600',
  SISTEM: 'from-indigo-500 to-violet-500', voice: 'from-blue-500 to-blue-600', whatsapp: 'from-emerald-400 to-emerald-600',
  phone: 'from-blue-500 to-blue-600', instagram: 'from-pink-500 via-purple-500 to-purple-600', sms: 'from-orange-400 to-orange-600', web: 'from-cyan-500 to-teal-500',
};

// Hızlı yanıt şablonları — esnaf tek tıkla doldurabilir
const QUICK_TEMPLATES = [
  { label: 'Kargoya Verildi', text: 'Talebiniz işleme alındı, eksik/yeni ürününüz kargoya verilmiştir.', icon: Package, bg: 'from-amber-400 to-orange-500 shadow-amber-500/20' },
  { label: 'İade/Ödeme Yapıldı', text: 'Ödemeniz/iadeniz kontrol edilip hesabınıza tanımlanmıştır.', icon: Banknote, bg: 'from-emerald-400 to-emerald-600 shadow-emerald-500/20' },
  { label: 'Müşteri Arandı', text: 'Müşterimizle telefon görüşmesi yapılarak detaylar iletilmiştir.', icon: PhoneCall, bg: 'from-blue-500 to-blue-600 shadow-blue-500/20' },
];

type FilterTab = 'all' | 'open' | 'high' | 'resolved';

const FILTER_TABS: { key: FilterTab; label: string; icon: typeof AlertTriangle; gradient: string }[] = [
  { key: 'all', label: 'Tümü', icon: AlertTriangle, gradient: 'from-slate-600 to-slate-700' },
  { key: 'open', label: 'Müdahale Gerekli', icon: AlertTriangle, gradient: 'from-amber-500 to-orange-500' },
  { key: 'high', label: 'Yüksek / Kritik', icon: AlertTriangle, gradient: 'from-red-500 to-rose-600' },
  { key: 'resolved', label: 'Çözülenler', icon: CheckCircle2, gradient: 'from-emerald-500 to-green-600' },
];

interface Complaint {
  id: string;
  ticket_number: string;
  channel: string;
  category: string;
  status: string; // open | resolved
  severity: string; // LOW|NORMAL|HIGH|CRITICAL
  description: string;
  session_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_analysis?: {
    order_count: number;
    total_spent: number;
    avg_basket: number;
    last_order_days: number | null;
    segment: string;
    risk: string;
  };
  created_at: string;
}

const SEGMENT_CONFIG: Record<string, { label: string; gradient: string }> = {
  VIP: { label: 'VIP', gradient: 'from-amber-400 to-orange-500' },
  SADIK: { label: 'Sadık', gradient: 'from-violet-500 to-purple-600' },
  AKTİF: { label: 'Aktif', gradient: 'from-sky-400 to-blue-500' },
  AKTIF: { label: 'Aktif', gradient: 'from-sky-400 to-blue-500' },
  YENİ: { label: 'Yeni', gradient: 'from-emerald-400 to-teal-500' },
  YENI: { label: 'Yeni', gradient: 'from-emerald-400 to-teal-500' },
};

const RISK_CONFIG: Record<string, { label: string; gradient: string }> = {
  YÜKSEK: { label: 'Yüksek Risk', gradient: 'from-red-500 to-rose-600' },
  YUKSEK: { label: 'Yüksek Risk', gradient: 'from-red-500 to-rose-600' },
  ORTA: { label: 'Orta Risk', gradient: 'from-amber-400 to-orange-500' },
  DÜŞÜK: { label: 'Düşük Risk', gradient: 'from-emerald-400 to-teal-500' },
  DUSUK: { label: 'Düşük Risk', gradient: 'from-emerald-400 to-teal-500' },
  BİLİNMİYOR: { label: 'Bilinmiyor', gradient: 'from-slate-400 to-slate-500' },
  BILINMIYOR: { label: 'Bilinmiyor', gradient: 'from-slate-400 to-slate-500' },
};

export default function ComplaintsPage() {
  return (
    <Suspense fallback={null}>
      <ComplaintsContent />
    </Suspense>
  );
}

function ComplaintsContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tid, setTid] = useState('');
  const [highlighted, setHighlighted] = useState<string | null>(highlightId);
  // Not + çözüldü modalı
  const [resolveTarget, setResolveTarget] = useState<Complaint | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolveSaving, setResolveSaving] = useState(false);
  const [resolveMsg, setResolveMsg] = useState<string | null>(null);

  useEffect(() => { import('@/lib/tenant').then(m => setTid(m.getTenantId())); }, []);

  const load = () => {
    if (!tid) return;
    fetch(`/api/complaints/${tid}`)
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : (data?.success === false ? [] : []);
        setComplaints(arr as Complaint[]);
        if (highlightId) {
          setExpanded(highlightId);
          setHighlighted(highlightId);
          setTimeout(() => {
            document.getElementById(`complaint-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      })
      .catch(() => setComplaints([]));
  };

  useEffect(load, [tid, highlightId]);

  const openComplaints = complaints.filter(c => c.status !== 'resolved');
  const highPriority = complaints.filter(c => {
    const s = String(c.severity || 'NORMAL').toUpperCase();
    return (s === 'HIGH' || s === 'CRITICAL') && c.status !== 'resolved';
  });
  const resolved = complaints.filter(c => c.status === 'resolved');

  const filtered = complaints.filter(c => {
    if (search && !(c.description || '').toLowerCase().includes(search.toLowerCase()) && !(c.customer_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTab === 'open' && c.status === 'resolved') return false;
    if (filterTab === 'high') {
      const s = String(c.severity || 'NORMAL').toUpperCase();
      if ((s !== 'HIGH' && s !== 'CRITICAL') || c.status === 'resolved') return false;
    }
    if (filterTab === 'resolved' && c.status !== 'resolved') return false;
    return true;
  });

  const getCount = (tab: FilterTab) => {
    switch (tab) {
      case 'all': return complaints.length;
      case 'open': return openComplaints.length;
      case 'high': return highPriority.length;
      case 'resolved': return resolved.length;
    }
  };

  const openResolveModal = (c: Complaint) => {
    setResolveTarget(c);
    setResolveNote('');
    setResolveMsg(null);
  };

  const doResolve = async () => {
    if (!resolveTarget) return;
    setResolveSaving(true);
    setResolveMsg(null);
    try {
      const res = await fetch(`/api/complaints/${resolveTarget.id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
        body: JSON.stringify({ tenantId: tid, note: resolveNote }),
      });
      const data = await res.json();
      if (data.success) {
        setComplaints(prev => prev.map(c => c.id === resolveTarget.id ? { ...c, status: 'resolved' } : c));
        setResolveMsg('Talep çözüldü. Not müşteriye gönderildi.');
        setTimeout(() => { setResolveTarget(null); setExpanded(null); }, 1200);
      } else {
        setResolveMsg(data.message || 'Çözülürken hata oluştu.');
      }
    } catch {
      setResolveMsg('Sunucu hatası.');
    }
    setResolveSaving(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
              <AlertTriangle size={16} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Destek & Talep Yönetimi</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Müşteri talep ve istekleri</p>
        </div>
        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-full text-xs font-semibold text-indigo-600 dark:text-indigo-400">{complaints.length} kayıt</span>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Talep', value: complaints.length, icon: AlertTriangle, gradient: 'from-blue-500 to-cyan-600' },
          { label: 'Müdahale Gerekli', value: openComplaints.length, icon: AlertTriangle, gradient: 'from-amber-500 to-orange-600' },
          { label: 'Yüksek / Kritik', value: highPriority.length, icon: AlertTriangle, gradient: 'from-red-500 to-rose-600' },
          { label: 'Çözülenler', value: resolved.length, icon: CheckCircle2, gradient: 'from-emerald-500 to-green-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                <kpi.icon size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{kpi.value}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{kpi.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs + Search — segmented pill stili */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Müşteri veya talep no ara..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900" />
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl ml-auto">
          {FILTER_TABS.map((tab) => {
            const active = filterTab === tab.key;
            const count = getCount(tab.key);
            const TabIcon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setFilterTab(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}>
                <TabIcon size={12} /> {tab.label}
                {count > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <p className="text-slate-700 dark:text-slate-300 font-semibold">Talep veya istek bulunmuyor</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tüm talepler çözülmüş görünüyor</p>
          </div>
        ) : filtered.map((c) => {
          const sevKey = String(c.severity || 'NORMAL').toUpperCase();
          const sevCfg = SEVERITY_CONFIG[sevKey] || { label: sevKey, gradient: 'from-slate-400 to-slate-500' };
          const channel = c.channel || 'phone';
          const ChannelIcon = CHANNEL_ICONS[channel] || Settings;
          const isResolved = c.status === 'resolved';
          const customerPhone = c.customer_phone || '';
          const customerName = c.customer_name || '';
          const customerAddress = c.customer_address || '';

          return (
            <React.Fragment key={c.id}>
              <div id={`complaint-${c.id}`} onClick={() => setExpanded(expanded === c.id ? null : c.id)} className={`cursor-pointer bg-white dark:bg-slate-800 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 p-4 ${
                highlighted === c.id ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10' : isResolved ? 'border-emerald-200 dark:border-emerald-800' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800'
              }`}>
                <div className="flex items-start gap-4">
                  {/* Left: Customer + Ticket */}
                  <div className="flex-shrink-0 space-y-1" style={{ minWidth: '140px' }}>
                    {customerName && (
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{customerName}</span>
                      </div>
                    )}
                    {c.ticket_number && (
                      <div className="flex items-center gap-1.5">
                        <Hash size={12} className="text-slate-400" />
                        <span className="text-[10px] font-mono text-slate-500">{c.ticket_number}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock size={11} className="text-slate-400" />
                      <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Center: Description + Badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white bg-gradient-to-r ${CHANNEL_GRADIENT[channel] || 'from-slate-500 to-slate-600'} shadow-sm`}>
                        <ChannelIcon size={12} /> {CHANNEL_LABELS[channel] || channel}
                      </span>
                      <span className="text-[10px] text-slate-400">{isResolved ? 'Çözüldü' : 'Açık'}</span>
                    </div>
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300 line-clamp-2">{c.description}</h3>
                  </div>

                  {/* Right: Severity + Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${sevCfg.gradient} shadow-sm`}>{sevCfg.label}</span>
                    {isResolved ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-500 shadow-sm"><CheckCircle2 size={12} /> Çözüldü</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {customerPhone && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); window.open(`tel:${customerPhone}`, '_blank'); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm hover:from-blue-600 hover:to-blue-700 transition-all"><Phone size={11} /> Ara</button>
                            <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${customerPhone.replace(/\D/g, '')}`, '_blank'); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-white bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-sm hover:from-emerald-500 hover:to-emerald-700 transition-all"><WhatsAppIcon size={11} /> WhatsApp</button>
                          </>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setExpanded(expanded === c.id ? null : c.id); }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 shadow-sm hover:from-indigo-600 hover:to-violet-600 transition-all">{expanded === c.id ? 'Kapat' : 'İncele'} <ChevronRight size={12} className={`transition-transform ${expanded === c.id ? 'rotate-90' : ''}`} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Detail */}
              {expanded === c.id && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                      <span className="text-[10px] text-slate-400 block mb-1">Açıklama</span>
                      <span className="text-xs text-slate-700 dark:text-slate-300">{c.description}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 space-y-1">
                      <span className="text-[10px] text-slate-400 block mb-1">Müşteri Bilgileri</span>
                      <div className="flex items-center gap-1.5"><User size={12} className="text-slate-400" /><span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{customerName || '-'}</span></div>
                      {customerPhone && <div className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /><span className="text-xs text-slate-600 dark:text-slate-300">{customerPhone}</span></div>}
                      {(customerAddress || c.customer_city) && <div className="flex items-center gap-1.5"><MapPin size={12} className="text-slate-400" /><span className="text-xs text-slate-600 dark:text-slate-300">{[customerAddress, c.customer_city].filter(Boolean).join(', ') || '-'}</span></div>}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                      <span className="text-[10px] text-slate-400 block mb-1">Kanal</span>
                      <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1"><ChannelIcon size={12} className="text-slate-500" /> {CHANNEL_LABELS[channel] || channel}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                      <span className="text-[10px] text-slate-400 block mb-1">Ticket No</span>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">{c.ticket_number || '—'}</span>
                    </div>
                  </div>

                  {/* Müşteri kartı (kompakt) */}
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">{(customerName || '?')[0].toUpperCase()}</div>
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{customerName || 'Bilinmeyen'}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{customerPhone || '—'}</p>
                          {(customerAddress || c.customer_city) && <p className="text-[11px] text-slate-400 truncate flex items-center gap-1"><MapPin size={11} /> {[customerAddress, c.customer_city].filter(Boolean).join(', ')}</p>}
                        </div>
                      </div>
                      <a href={`/customers?phone=${encodeURIComponent(customerPhone)}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline shrink-0"><User size={12} /> Detay</a>
                    </div>
                    {c.customer_analysis && (
                      <div className="grid grid-cols-4 gap-1.5">
                        <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-100 dark:border-slate-700 px-2 py-1.5 text-center">
                          <p className="text-[9px] text-slate-400 uppercase tracking-wide">Sipariş</p>
                          <p className="text-[11px] font-bold text-slate-800 dark:text-white mt-0.5">{c.customer_analysis.order_count}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-100 dark:border-slate-700 px-2 py-1.5 text-center">
                          <p className="text-[9px] text-slate-400 uppercase tracking-wide">Harcama</p>
                          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{c.customer_analysis.total_spent.toLocaleString('tr-TR')} ₺</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-100 dark:border-slate-700 px-2 py-1.5 text-center">
                          <p className="text-[9px] text-slate-400 uppercase tracking-wide">Ort. Sepet</p>
                          <p className="text-[11px] font-bold text-violet-600 dark:text-violet-400 mt-0.5">{c.customer_analysis.avg_basket.toLocaleString('tr-TR')} ₺</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-100 dark:border-slate-700 px-2 py-1.5 text-center">
                          <p className="text-[9px] text-slate-400 uppercase tracking-wide">Son Sip.</p>
                          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">{c.customer_analysis.last_order_days == null ? '—' : `${c.customer_analysis.last_order_days} gün`}</p>
                        </div>
                      </div>
                    )}
                    {c.customer_analysis && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${(SEGMENT_CONFIG[String(c.customer_analysis.segment).toUpperCase()] || { gradient: 'from-slate-500 to-slate-600' }).gradient} shadow-sm`}>
                          <ShoppingBag size={10} /> {SEGMENT_CONFIG[String(c.customer_analysis.segment).toUpperCase()]?.label || c.customer_analysis.segment}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${(RISK_CONFIG[String(c.customer_analysis.risk).toUpperCase()] || { gradient: 'from-slate-500 to-slate-600' }).gradient} shadow-sm`}>
                          <Shield size={10} /> {RISK_CONFIG[String(c.customer_analysis.risk).toUpperCase()]?.label || c.customer_analysis.risk}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.session_id && (
                      <a href={`/calls?session=${c.session_id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg text-xs font-semibold shadow-sm hover:from-sky-600 hover:to-blue-700 transition-all"><MessageSquare size={12} /> Görüşme Detayı</a>
                    )}
                    {!isResolved && (
                      <button onClick={(e) => { e.stopPropagation(); openResolveModal(c); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg text-xs font-semibold shadow-sm hover:from-emerald-600 hover:to-green-600 transition-all"><StickyNote size={12} /> Not Ekle & Çözüldü İşaretle</button>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Resolve Modal */}
      {resolveTarget && (() => {
        const rch = resolveTarget.channel || 'phone';
        const RIcon = CHANNEL_ICONS[rch] || Settings;
        const isWA = rch === 'whatsapp';
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setResolveTarget(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            {/* Başlık — müşteri + talep no + kanal badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0"><CheckCircle2 size={17} /></div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Talebi Çözümlendi İşaretle</h3>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-100"><User size={13} /> {resolveTarget.customer_name || 'Bilinmiyor'}</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-sm font-mono font-bold text-indigo-600 dark:text-indigo-300">#{resolveTarget.ticket_number || '—'}</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold text-white bg-gradient-to-r ${CHANNEL_GRADIENT[rch] || 'from-slate-500 to-slate-600'}`}><RIcon size={13} /> {CHANNEL_LABELS[rch] || rch}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setResolveTarget(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">✕</button>
            </div>

            {/* Hızlı yanıt pill'leri — canlı gradient rozetler */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TEMPLATES.map((t) => {
                const TIcon = t.icon;
                return (
                <button key={t.label} onClick={() => setResolveNote(t.text)} title={`Notu doldur: ${t.label}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${t.bg} shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all`}>
                  <TIcon size={13} /> {t.label}
                </button>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Müşteriye Gönderilecek Not</label>
              <textarea value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} rows={3} placeholder="Örn: Talebinizle ilgilenildi, eksik ürününüz yarın kargoya verilecektir."
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400/40 transition-all resize-none" />
              <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                <MessageSquare size={11} className={`${isWA ? 'text-emerald-500' : 'text-orange-500'}`} />
                {isWA ? 'WhatsApp kanalından geldi — not WhatsApp üzerinden gönderilecek.' : 'SMS kanalından geldi — not SMS üzerinden gönderilecek.'}
              </p>
            </div>

            {resolveMsg && <p className={`text-xs font-medium ${resolveMsg.startsWith('Talep çözüldü') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{resolveMsg}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={doResolve} disabled={resolveSaving} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {resolveSaving ? <><span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> İşleniyor...</> : <><CheckCircle2 size={15} /> Onayla & Müşteriye Bildir</>}
              </button>
              <button onClick={() => setResolveTarget(null)} className="px-4 py-2.5 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">İptal</button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
