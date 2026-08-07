'use client';

import { useEffect, useState } from 'react';
import { getTenantId } from '@/lib/tenant';
import { Search, Calendar, Filter } from 'lucide-react';

function authHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
  } catch { return { 'Content-Type': 'application/json' }; }
}

const EVENT_LABELS: Record<string, string> = {
  ORDER_CREATED: '📦 Sipariş Oluşturuldu',
  ORDER_UPDATED: '✏️ Sipariş Düzenlendi',
  ORDER_SHIPPED: '🚚 Kargoya Verildi',
  ORDER_CANCELLED: '❌ Sipariş İptal Edildi',
  STATUS_NEW: '🆕 Yeni Sipariş',
  PAYMENT_CONFIRMED: '✅ Ödeme Onaylandı',
  PAYMENT_WAITING: '💳 Ödeme Bekliyor',
  CARGO_REMINDER: '⏰ Kargo Hatırlatması',
  HUMAN_REQUIRED: '👤 İnsan Müdahalesi Gerekli',
  COMPLAINT_OPEN: '📣 Şikayet Kaydı Açıldı',
  PRINT_REQUESTED: '🖨️ Yazdırma İsteği',
  FOLLOWUP_PAYMENT_REMINDER: '💬 Ödeme Hatırlatması Gönderildi',
  FOLLOWUP_SATISFACTION_CHECK: '📝 Memnuniyet Anketi Gönderildi',
  FOLLOWUP_REORDER_INVITE: '🔄 Tekrar Sipariş Daveti Gönderildi',
  STATUS_UPDATED: '🔄 Durum Güncellendi',
};

interface LogEntry {
  id: string;
  created_at: string;
  event_type: string;
  description: string;
  entity_type: string;
  entity_id: string;
  actor_type: string;
  metadata?: Record<string, unknown>;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [search, setSearch] = useState('');
  const tid = getTenantId();

  useEffect(() => {
    loadLogs();
  }, [filterType, filterDate]);

  const loadLogs = async () => {
    const params = new URLSearchParams({ limit: '200' });
    if (filterType) params.set('event_type', filterType);
    if (filterDate) params.set('from', filterDate);

    try {
      const res = await fetch(`/api/activity-log/${tid}?${params.toString()}`, { headers: authHeaders() });
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {}
  };

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (l.description || '').toLowerCase().includes(q) || (l.event_type || '').toLowerCase().includes(q);
  });

  const eventTypes = [...new Set(logs.map((l) => l.event_type))];

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sistem Logları</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Tüm sistem hareketleri ve işlem kayıtları</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Log ara..."
            className="pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white w-48"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar size={14} className="text-gray-400" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
          {filterDate && (
            <button onClick={() => setFilterDate('')} className="text-xs text-indigo-500">Temizle</button>
          )}
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
          <option value="">Tüm İşlemler</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>{EVENT_LABELS[t] || t}</option>
          ))}
        </select>

        <span className="text-xs text-gray-400 ml-auto">{filtered.length} kayıt</span>
      </div>

      {/* Log Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase">Tarih</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase">İşlem</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase">Açıklama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                    <div>{new Date(log.created_at).toLocaleDateString('tr-TR')}</div>
                    <div className="text-[10px]">{new Date(log.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      {EVENT_LABELS[log.event_type] || log.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-slate-400 max-w-md truncate">
                    {log.description || '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-sm text-gray-400">
                    Henüz sistem kaydı bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
