'use client';

import { getTenantId } from '@/lib/tenant';

import React, { useEffect, useState } from 'react';
import { Search, Filter, AlertTriangle, Bot, CheckCircle2, ChevronRight, MessageSquare, PhoneCall, Camera } from 'lucide-react';

const SEVERITY_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  LOW: { label: 'DÜŞÜK', color: 'bg-green-100 text-green-700 border-green-200', badge: 'bg-green-50 text-green-600' },
  NORMAL: { label: 'NORMAL', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', badge: 'bg-yellow-50 text-yellow-600' },
  HIGH: { label: 'YÜKSEK', color: 'bg-rose-100 text-rose-700 border-rose-200', badge: 'bg-rose-50 text-rose-600' },
  CRITICAL: { label: 'KRİTİK', color: 'bg-red-100 text-red-700 border-red-200', badge: 'bg-red-50 text-red-600' },
};

const CHANNEL_ICON: Record<string, string> = {
  VOICE: '📞', WHATSAPP: '💬', PHONE: '📞', INSTAGRAM: '📸', SISTEM: '⚙️',
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const tid = getTenantId();

  useEffect(() => {
    fetch(`/api/timeline/recent/${tid}?limit=100`)
      .then(r => r.json())
      .then(data => {
        const filtered = (Array.isArray(data) ? data : []).filter((e: Record<string, unknown>) =>
          (e.event_type as string)?.startsWith('COMPLAINT') || (e.event_type as string) === 'HUMAN_REQUIRED'
        );
        setComplaints(filtered.length > 0 ? filtered : getMockComplaints());
      })
      .catch(() => setComplaints(getMockComplaints()));
  }, []);

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
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Destek & Talep Yönetimi</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Müşteri şikayet ve talepleri</p>
        </div>
        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400">{complaints.length} kayıt</span>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{complaints.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Toplam Talep</p>
          </div>
        </div>
        <div className="bg-rose-50/50 dark:bg-rose-900/10 rounded-xl border border-rose-200 dark:border-rose-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{highPriority.length}</p>
            <p className="text-xs text-rose-600 dark:text-rose-400">Yüksek Öncelikli</p>
          </div>
        </div>
        <div className="bg-violet-50/50 dark:bg-violet-900/10 rounded-xl border border-violet-200 dark:border-violet-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{aiDetected.length}</p>
            <p className="text-xs text-violet-600 dark:text-violet-400">AI Tarafından Yakalanan</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Müşteri veya talep no ara..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
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
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Şikayet veya istek bulunmuyor</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tüm talepler çözülmüş görünüyor</p>
          </div>
        ) : filtered.map((c, i) => {
          const meta = c.metadata as Record<string, unknown> || {};
          const severity = (meta.severity as string) || 'NORMAL';
          const sevCfg = SEVERITY_CONFIG[severity] || { label: severity, color: 'bg-gray-100 text-gray-600 border-gray-200', badge: 'bg-gray-50 text-gray-600' };
          const channel = (c.channel as string) || 'SISTEM';
          const channelIcon = CHANNEL_ICON[channel] || '📋';
          const isResolved = c.event_type === 'COMPLAINT_RESOLVED';

          return (
            <React.Fragment key={i}>
            <div className={`bg-white dark:bg-slate-800 rounded-xl border p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-start justify-between ${isResolved ? 'border-green-200 dark:border-green-800' : 'border-slate-200 dark:border-slate-700'}`}>
              {/* Left */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  {c.actor_type === 'AI' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-800">
                      <Bot className="w-3 h-3" /> YZ ile Yakalandı
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                    {channelIcon} Kanal: {channel}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(c.created_at as string).toLocaleString('tr-TR')}</span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                  {c.description as string}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>📋 {c.event_type as string}</span>
                  {Boolean(meta.ticket_number) && <span>· Ticket: {String(meta.ticket_number)}</span>}
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${sevCfg.color}`}>
                  {sevCfg.label}
                </span>
                {isResolved ? (
                  <span className="flex items-center gap-1 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Çözüldü
                  </span>
                ) : (
                  <button onClick={() => setExpanded(expanded === c.id ? null : String(c.id))}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                    {expanded === c.id ? 'Kapat' : 'İncele'} <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded === c.id ? 'rotate-90' : ''}`} />
                  </button>
                )}
              </div>
            </div>
            {/* Expanded Detail */}
            {expanded === c.id && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                  <span className="text-xs text-slate-400 block mb-1">Açıklama</span>
                  <span className="text-slate-700 dark:text-slate-300">{c.description as string}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                  <span className="text-xs text-slate-400 block mb-1">Oluşturan</span>
                  <span className="text-slate-700 dark:text-slate-300">{c.actor_type === 'AI' ? '🤖 Yapay Zeka' : c.actor_type === 'HUMAN' ? '👤 Müşteri' : '👨‍💼 Personel'}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                  <span className="text-xs text-slate-400 block mb-1">Kanal</span>
                  <span className="text-slate-700 dark:text-slate-300">{channelIcon} {channel}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                  <span className="text-xs text-slate-400 block mb-1">Ticket No</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono">{String(meta.ticket_number || '—')}</span>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  {!isResolved && (
                    <button onClick={() => {
                      const updated = complaints.map(x => x.id === c.id ? { ...x, event_type: 'COMPLAINT_RESOLVED' } : x);
                      setComplaints(updated);
                      setExpanded(null);
                    }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Çözüldü Olarak İşaretle
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
