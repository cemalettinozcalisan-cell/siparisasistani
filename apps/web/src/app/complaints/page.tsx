'use client';

import React, { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, AlertTriangle, Bot, CheckCircle2, ChevronRight, ShieldAlert, PhoneCall, MessageSquare, Camera, Settings, Clock, User, Hash, Phone, MessageCircle } from 'lucide-react';

const SEVERITY_CONFIG: Record<string, { label: string; gradient: string }> = {
  LOW: { label: 'Düşük', gradient: 'from-emerald-400 to-teal-500' },
  NORMAL: { label: 'Normal', gradient: 'from-amber-400 to-orange-500' },
  HIGH: { label: 'Yüksek', gradient: 'from-orange-500 to-red-500' },
  CRITICAL: { label: 'Kritik', gradient: 'from-red-500 to-rose-600' },
};

const CHANNEL_LABELS: Record<string, string> = {
  VOICE: 'Sesli', WHATSAPP: 'WhatsApp', PHONE: 'Telefon', INSTAGRAM: 'Instagram', SISTEM: 'Sistem',
};

const CHANNEL_ICONS: Record<string, typeof PhoneCall> = {
  VOICE: PhoneCall, WHATSAPP: MessageSquare, PHONE: PhoneCall, INSTAGRAM: Camera, SISTEM: Settings,
};

const CHANNEL_GRADIENT: Record<string, string> = {
  VOICE: 'from-blue-500 to-blue-600',
  WHATSAPP: 'from-emerald-400 to-emerald-600',
  PHONE: 'from-blue-500 to-blue-600',
  INSTAGRAM: 'from-pink-500 via-purple-500 to-purple-600',
  SISTEM: 'from-indigo-500 to-violet-500',
};

const EVENT_LABELS: Record<string, string> = {
  COMPLAINT_OPEN: 'Talep Açıldı', COMPLAINT_RESOLVED: 'Çözüldü', HUMAN_REQUIRED: 'Müdahale Gerekli',
};

const ACTOR_LABELS: Record<string, string> = {
  AI: 'Yapay Zeka', HUMAN: 'Müşteri', STAFF: 'Personel',
};

type FilterTab = 'all' | 'open' | 'high' | 'resolved';

const FILTER_TABS: { key: FilterTab; label: string; icon: typeof AlertTriangle; gradient: string }[] = [
  { key: 'all', label: 'Tümü', icon: AlertTriangle, gradient: 'from-slate-600 to-slate-700' },
  { key: 'open', label: 'Müdahale Gerekli', icon: AlertTriangle, gradient: 'from-amber-500 to-orange-500' },
  { key: 'high', label: 'Yüksek / Kritik', icon: AlertTriangle, gradient: 'from-red-500 to-rose-600' },
  { key: 'resolved', label: 'Çözülenler', icon: CheckCircle2, gradient: 'from-emerald-500 to-green-600' },
];

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
  const [complaints, setComplaints] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tid, setTid] = useState('');
  const [highlighted, setHighlighted] = useState<string | null>(highlightId);

  useEffect(() => { import('@/lib/tenant').then(m => setTid(m.getTenantId())); }, []);

  useEffect(() => {
    if (!tid) return;
    fetch(`/api/timeline/recent/${tid}?limit=100`)
      .then(r => r.json())
      .then(data => {
        const filtered = (Array.isArray(data) ? data : []).filter((e: Record<string, unknown>) =>
          (e.event_type as string)?.startsWith('COMPLAINT') || (e.event_type as string) === 'HUMAN_REQUIRED'
        );
        setComplaints(filtered.length > 0 ? filtered : getMockComplaints());
        // URL'den gelen id: otomatik genişlet + vurgula
        if (highlightId) {
          setExpanded(highlightId);
          setHighlighted(highlightId);
          setTimeout(() => {
            document.getElementById(`complaint-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      })
      .catch(() => setComplaints(getMockComplaints()));
  }, [tid, highlightId]);

  const getMockComplaints = (): Record<string, unknown>[] => [
    { id: 'c1', event_type: 'COMPLAINT_OPEN', description: 'AI, Test Müşteri için yüksek seviyede talep kaydı oluşturdu: Geç teslimat', actor_type: 'AI', channel: 'VOICE', customer_name: 'Test Müşteri', customer_phone: '05321234567', created_at: new Date(Date.now() - 3600000).toISOString(), metadata: { severity: 'HIGH', ticket_number: 'TKT-0001' } },
    { id: 'c2', event_type: 'COMPLAINT_OPEN', description: 'Müşteri: Ürünlerin son kullanma tarihi geçmiş', actor_type: 'HUMAN', channel: 'WHATSAPP', customer_name: 'Ali Kaya', customer_phone: '05329876543', created_at: new Date(Date.now() - 7200000).toISOString(), metadata: { severity: 'CRITICAL', ticket_number: 'TKT-0002' } },
    { id: 'c3', event_type: 'HUMAN_REQUIRED', description: 'Müşteri iade talebinde bulundu, insan müdahalesi gerekiyor', actor_type: 'AI', channel: 'WHATSAPP', customer_name: 'Mehmet Öztürk', customer_phone: '05431112233', created_at: new Date(Date.now() - 14400000).toISOString(), metadata: { severity: 'NORMAL', ticket_number: 'TKT-0003' } },
    { id: 'c4', event_type: 'COMPLAINT_RESOLVED', description: 'Talep çözüldü: Eksik ürün teslim edildi', actor_type: 'STAFF', channel: 'SYSTEM', customer_name: 'Zafer Ayyıldız', customer_phone: '05331114455', created_at: new Date(Date.now() - 28800000).toISOString(), metadata: { severity: 'LOW', ticket_number: 'TKT-0004' } },
  ];

  const openComplaints = complaints.filter(c => c.event_type !== 'COMPLAINT_RESOLVED');
  const highPriority = complaints.filter(c => {
    const meta = c.metadata as Record<string, unknown> || {};
    const sev = (meta.severity as string) || 'NORMAL';
    return sev === 'HIGH' || sev === 'CRITICAL';
  });
  const aiDetected = complaints.filter(c => c.actor_type === 'AI');
  const resolved = complaints.filter(c => c.event_type === 'COMPLAINT_RESOLVED');

  const filtered = complaints.filter(c => {
    if (search && !(c.description as string || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTab === 'open' && c.event_type === 'COMPLAINT_RESOLVED') return false;
    if (filterTab === 'high') {
      const meta = c.metadata as Record<string, unknown> || {};
      const sev = (meta.severity as string) || 'NORMAL';
      if (sev !== 'HIGH' && sev !== 'CRITICAL') return false;
    }
    if (filterTab === 'resolved' && c.event_type !== 'COMPLAINT_RESOLVED') return false;
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

      {/* KPI Stats — 4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Talep', value: complaints.length, icon: AlertTriangle, gradient: 'from-blue-500 to-cyan-600', iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600' },
          { label: 'Müdahale Gerekli', value: openComplaints.length, icon: AlertTriangle, gradient: 'from-amber-500 to-orange-600', iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600' },
          { label: 'AI Tespiti', value: aiDetected.length, icon: Bot, gradient: 'from-violet-500 to-purple-600', iconBg: 'bg-violet-50 dark:bg-violet-900/20', iconColor: 'text-violet-600' },
          { label: 'Çözülenler', value: resolved.length, icon: CheckCircle2, gradient: 'from-emerald-500 to-green-600', iconBg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-600' },
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

      {/* Filter Tabs + Search */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Müşteri veya talep no ara..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900" />
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map((tab) => {
            const active = filterTab === tab.key;
            const count = getCount(tab.key);
            const TabIcon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setFilterTab(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                  active
                    ? 'text-white shadow-sm bg-gradient-to-r ' + tab.gradient
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}>
                <TabIcon size={12} /> {tab.label}
                <span className={`ml-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  active ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>{count}</span>
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
        ) : filtered.map((c, i) => {
          const meta = c.metadata as Record<string, unknown> || {};
          const severity = (meta.severity as string) || 'NORMAL';
          const sevCfg = SEVERITY_CONFIG[severity] || { label: severity, gradient: 'from-slate-400 to-slate-500' };
          const channel = (c.channel as string) || 'SISTEM';
          const ChannelIcon = CHANNEL_ICONS[channel] || Settings;
          const isResolved = c.event_type === 'COMPLAINT_RESOLVED';
          const isOpen = c.event_type === 'COMPLAINT_OPEN';
          const customerPhone = (c.customer_phone as string) || '';
          const customerName = (c.customer_name as string) || '';

          return (
            <React.Fragment key={i}>
            <div id={`complaint-${c.id}`} className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 p-4 ${
              highlighted === c.id
                ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10'
                : isResolved ? 'border-emerald-200 dark:border-emerald-800' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800'
            }`}>
              <div className="flex items-start gap-4">
                {/* Left: Customer + Ticket */}
                <div className="flex-shrink-0" style={{ minWidth: '140px' }}>
                  {customerName && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <User size={12} className="text-slate-400" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{customerName}</span>
                    </div>
                  )}
                  {Boolean(meta.ticket_number) && (
                    <div className="flex items-center gap-1.5">
                      <Hash size={12} className="text-slate-400" />
                      <span className="text-[10px] font-mono text-slate-500">{String(meta.ticket_number)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock size={11} className="text-slate-400" />
                    <span className="text-[10px] text-slate-400">{new Date(c.created_at as string).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Center: Description + Badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {c.actor_type === 'AI' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 shadow-sm">
                        <Bot size={11} /> AI Tespiti
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white bg-gradient-to-r ${CHANNEL_GRADIENT[channel] || 'from-slate-500 to-slate-600'} shadow-sm`}>
                      <ChannelIcon size={12} /> {CHANNEL_LABELS[channel] || channel}
                    </span>
                    <span className="text-[10px] text-slate-400">{EVENT_LABELS[c.event_type as string] || (c.event_type as string)}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{c.description as string}</h3>
                </div>

                {/* Right: Severity + Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${sevCfg.gradient} shadow-sm`}>
                    {sevCfg.label}
                  </span>
                  {isResolved ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-500 shadow-sm">
                      <CheckCircle2 size={12} /> Çözüldü
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {customerPhone && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); window.open(`tel:${customerPhone}`, '_blank'); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm hover:from-blue-600 hover:to-blue-700 transition-all">
                            <Phone size={11} /> Ara
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${customerPhone.replace(/\D/g, '')}`, '_blank'); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-white bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-sm hover:from-emerald-500 hover:to-emerald-700 transition-all">
                            <MessageCircle size={11} /> WhatsApp
                          </button>
                        </>
                      )}
                      <button onClick={() => setExpanded(expanded === c.id ? null : String(c.id))}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 shadow-sm hover:from-indigo-600 hover:to-violet-600 transition-all">
                        {expanded === c.id ? 'Kapat' : 'İncele'} <ChevronRight size={12} className={`transition-transform ${expanded === c.id ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Expanded Detail */}
            {expanded === c.id && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm p-4 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                  <span className="text-[10px] text-slate-400 block mb-1">Açıklama</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300">{c.description as string}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                  <span className="text-[10px] text-slate-400 block mb-1">Oluşturan</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    {c.actor_type === 'AI' ? <Bot size={12} className="text-violet-500" /> : ''}
                    {ACTOR_LABELS[c.actor_type as string] || (c.actor_type as string)}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                  <span className="text-[10px] text-slate-400 block mb-1">Kanal</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <ChannelIcon size={12} className="text-slate-500" /> {CHANNEL_LABELS[channel] || channel}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                  <span className="text-[10px] text-slate-400 block mb-1">Ticket No</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">{String(meta.ticket_number || '—')}</span>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  {!isResolved && (
                    <button onClick={() => {
                      const updated = complaints.map(x => x.id === c.id ? { ...x, event_type: 'COMPLAINT_RESOLVED' } : x);
                      setComplaints(updated);
                      setExpanded(null);
                    }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg text-xs font-semibold shadow-sm hover:from-emerald-600 hover:to-green-600 transition-all">
                      <CheckCircle2 size={12} /> Çözüldü Olarak İşaretle
                    </button>
                  )}
                </div>
              </div>
            )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
