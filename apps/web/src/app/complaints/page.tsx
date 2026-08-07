'use client';

import React, { useEffect, useState } from 'react';
import { Search, AlertTriangle, Bot, CheckCircle2, ChevronRight, ShieldAlert, PhoneCall, MessageSquare, Camera, Settings } from 'lucide-react';

const SEVERITY_CONFIG: Record<string, { label: string; gradient: string }> = {
  LOW: { label: 'Düşük', gradient: 'from-emerald-400 to-teal-500' },
  NORMAL: { label: 'Normal', gradient: 'from-amber-400 to-orange-500' },
  HIGH: { label: 'Yüksek', gradient: 'from-orange-500 to-red-500' },
  CRITICAL: { label: 'Kritik', gradient: 'from-red-500 to-rose-600' },
};

const CHANNEL_LABELS: Record<string, string> = {
  VOICE: 'Sesli Arama', WHATSAPP: 'WhatsApp', PHONE: 'Telefon', INSTAGRAM: 'Instagram', SISTEM: 'Sistem',
};

const CHANNEL_ICONS: Record<string, typeof PhoneCall> = {
  VOICE: PhoneCall, WHATSAPP: MessageSquare, PHONE: PhoneCall, INSTAGRAM: Camera, SISTEM: Settings,
};

const EVENT_LABELS: Record<string, string> = {
  COMPLAINT_OPEN: 'Şikayet Açıldı', COMPLAINT_RESOLVED: 'Çözüldü', HUMAN_REQUIRED: 'Müdahale Gerekli',
};

const ACTOR_LABELS: Record<string, string> = {
  AI: 'Yapay Zeka', HUMAN: 'Müşteri', STAFF: 'Personel',
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tid, setTid] = useState('');

  useEffect(() => {
    import('@/lib/tenant').then(m => setTid(m.getTenantId()));
  }, []);

  useEffect(() => {
    if (!tid) return;
    fetch(`/api/timeline/recent/${tid}?limit=100`)
      .then(r => r.json())
      .then(data => {
        const filtered = (Array.isArray(data) ? data : []).filter((e: Record<string, unknown>) =>
          (e.event_type as string)?.startsWith('COMPLAINT') || (e.event_type as string) === 'HUMAN_REQUIRED'
        );
        setComplaints(filtered.length > 0 ? filtered : getMockComplaints());
      })
      .catch(() => setComplaints(getMockComplaints()));
  }, [tid]);

  const getMockComplaints = (): Record<string, unknown>[] => [
    { id: 'c1', event_type: 'COMPLAINT_OPEN', description: 'AI, Test Müşteri için yüksek seviyede şikayet kaydı oluşturdu: Geç teslimat', actor_type: 'AI', channel: 'VOICE', event_icon: '⚠️', created_at: new Date(Date.now() - 3600000).toISOString(), metadata: { severity: 'HIGH', ticket_number: '20260723-0001' } },
    { id: 'c2', event_type: 'COMPLAINT_OPEN', description: 'Müşteri: Ürünlerin son kullanma tarihi geçmiş', actor_type: 'HUMAN', channel: 'WHATSAPP', event_icon: '⚠️', created_at: new Date(Date.now() - 7200000).toISOString(), metadata: { severity: 'CRITICAL', ticket_number: '20260723-0002' } },
    { id: 'c3', event_type: 'HUMAN_REQUIRED', description: 'Müşteri iade talebinde bulundu, insan müdahalesi gerekiyor', actor_type: 'AI', channel: 'WHATSAPP', event_icon: '👤', created_at: new Date(Date.now() - 14400000).toISOString(), metadata: { severity: 'NORMAL', ticket_number: '20260723-0003' } },
    { id: 'c4', event_type: 'COMPLAINT_RESOLVED', description: 'Şikayet çözüldü: Eksik ürün teslim edildi', actor_type: 'STAFF', channel: 'SYSTEM', event_icon: '✅', created_at: new Date(Date.now() - 28800000).toISOString(), metadata: { severity: 'LOW', ticket_number: '20260722-0004' } },
  ];

  const highPriority = complaints.filter(c => {
    const meta = c.metadata as Record<string, unknown> || {};
    const sev = (meta.severity as string) || 'NORMAL';
    return sev === 'HIGH' || sev === 'CRITICAL';
  });
  const aiDetected = complaints.filter(c => c.actor_type === 'AI');

  const filtered = complaints.filter(c => {
    if (search && !(c.description as string || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (severityFilter !== 'all') {
      const meta = c.metadata as Record<string, unknown> || {};
      const sev = (meta.severity as string) || 'NORMAL';
      if (sev !== severityFilter) return false;
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert size={22} className="text-rose-500" /> Destek & Talep Yönetimi
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Müşteri şikayet ve talepleri</p>
        </div>
        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-full text-xs font-semibold text-indigo-600 dark:text-indigo-400">{complaints.length} kayıt</span>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{complaints.length}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Toplam Talep</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-rose-200 dark:border-rose-800 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-rose-700 dark:text-rose-300">{highPriority.length}</p>
            <p className="text-[10px] text-rose-600 dark:text-rose-400">Yüksek Öncelikli</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-violet-200 dark:border-violet-800 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
            <Bot size={18} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-violet-700 dark:text-violet-300">{aiDetected.length}</p>
            <p className="text-[10px] text-violet-600 dark:text-violet-400">AI Tarafından Yakalanan</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Müşteri veya talep no ara..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900" />
        </div>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900">
          <option value="all">Tüm Durumlar</option>
          <option value="LOW">Düşük</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">Yüksek</option>
          <option value="CRITICAL">Kritik</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <p className="text-slate-700 dark:text-slate-300 font-semibold">Şikayet veya istek bulunmuyor</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tüm talepler çözülmüş görünüyor</p>
          </div>
        ) : filtered.map((c, i) => {
          const meta = c.metadata as Record<string, unknown> || {};
          const severity = (meta.severity as string) || 'NORMAL';
          const sevCfg = SEVERITY_CONFIG[severity] || { label: severity, gradient: 'from-slate-400 to-slate-500' };
          const channel = (c.channel as string) || 'SISTEM';
          const ChannelIcon = CHANNEL_ICONS[channel] || Settings;
          const isResolved = c.event_type === 'COMPLAINT_RESOLVED';

          return (
            <React.Fragment key={i}>
            <div className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 flex items-start justify-between p-4 ${
              isResolved ? 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-300' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800'
            }`}>
              {/* Left */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {c.actor_type === 'AI' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 shadow-sm">
                      <Bot size={11} /> AI Yakaladı
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400">
                    <ChannelIcon size={11} /> {CHANNEL_LABELS[channel] || channel}
                  </span>
                  <span className="text-[10px] text-slate-400">{new Date(c.created_at as string).toLocaleString('tr-TR')}</span>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                  {c.description as string}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>{EVENT_LABELS[c.event_type as string] || (c.event_type as string)}</span>
                  {Boolean(meta.ticket_number) && <span>· Ticket: {String(meta.ticket_number)}</span>}
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${sevCfg.gradient} shadow-sm`}>
                  {sevCfg.label}
                </span>
                {isResolved ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-500 shadow-sm">
                    <CheckCircle2 size={12} /> Çözüldü
                  </span>
                ) : (
                  <button onClick={() => setExpanded(expanded === c.id ? null : String(c.id))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 shadow-sm hover:from-indigo-600 hover:to-violet-600 transition-all">
                    {expanded === c.id ? 'Kapat' : 'İncele'} <ChevronRight size={12} className={`transition-transform ${expanded === c.id ? 'rotate-90' : ''}`} />
                  </button>
                )}
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
