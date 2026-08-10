'use client';

import { useEffect, useState } from 'react';
import { Search, Calendar, History, ShoppingBag, Truck, CheckCircle, XCircle, Clock, AlertTriangle, Printer, MessageSquare, FileEdit, Plus, Trash2, Package, TrendingUp, Bot, User, Settings } from 'lucide-react';
import { getTenantId } from '@/lib/tenant';

function authHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
  } catch { return { 'Content-Type': 'application/json' }; }
}

const EVENT_LABELS: Record<string, string> = {
  ORDER_CREATED: 'Sipariş Oluşturuldu', ORDER_UPDATED: 'Sipariş Düzenlendi',
  ORDER_SHIPPED: 'Kargoya Verildi', ORDER_CANCELLED: 'Sipariş İptal Edildi',
  STATUS_NEW: 'Yeni Sipariş', PAYMENT_CONFIRMED: 'Ödeme Onaylandı',
  PAYMENT_WAITING: 'Ödeme Bekliyor', CARGO_REMINDER: 'Kargo Hatırlatması',
  HUMAN_REQUIRED: 'Müdahale Gerekli', COMPLAINT_OPEN: 'Şikayet Açıldı',
  PRINT_REQUESTED: 'Yazdırma İsteği', STATUS_UPDATED: 'Durum Güncellendi',
  SETTINGS_UPDATED: 'Ayarlar Güncellendi', USER_CREATED: 'Kullanıcı Eklendi',
  USER_DELETED: 'Kullanıcı Silindi', PRODUCT_CREATED: 'Ürün Eklendi',
  PRODUCT_DELETED: 'Ürün Silindi', PLAN_CHANGED: 'Paket Değiştirildi',
  ADDON_PURCHASED: 'Ek Paket Alındı',
};

const EVENT_ICONS: Record<string, typeof ShoppingBag> = {
  ORDER_CREATED: ShoppingBag, ORDER_UPDATED: FileEdit, ORDER_SHIPPED: Truck,
  ORDER_CANCELLED: XCircle, STATUS_NEW: ShoppingBag, PAYMENT_CONFIRMED: CheckCircle,
  PAYMENT_WAITING: Clock, CARGO_REMINDER: AlertTriangle, HUMAN_REQUIRED: AlertTriangle,
  COMPLAINT_OPEN: AlertTriangle, PRINT_REQUESTED: Printer, STATUS_UPDATED: CheckCircle,
  SETTINGS_UPDATED: FileEdit, USER_CREATED: Plus, USER_DELETED: Trash2,
  PRODUCT_CREATED: Package, PRODUCT_DELETED: Trash2, PLAN_CHANGED: TrendingUp,
  ADDON_PURCHASED: Plus,
};

const EVENT_GRADIENT: Record<string, string> = {
  ORDER_CREATED: 'from-blue-500 to-cyan-600', ORDER_UPDATED: 'from-indigo-500 to-violet-600',
  ORDER_SHIPPED: 'from-amber-500 to-orange-600', ORDER_CANCELLED: 'from-red-500 to-rose-600',
  STATUS_NEW: 'from-violet-500 to-purple-600', PAYMENT_CONFIRMED: 'from-emerald-500 to-green-600',
  PAYMENT_WAITING: 'from-amber-500 to-orange-500', CARGO_REMINDER: 'from-amber-500 to-orange-600',
  HUMAN_REQUIRED: 'from-red-500 to-rose-600', COMPLAINT_OPEN: 'from-red-500 to-rose-600',
  PRINT_REQUESTED: 'from-slate-500 to-slate-700', STATUS_UPDATED: 'from-emerald-500 to-green-600',
  SETTINGS_UPDATED: 'from-indigo-500 to-violet-600', USER_CREATED: 'from-emerald-500 to-green-600',
  USER_DELETED: 'from-red-500 to-rose-600', PRODUCT_CREATED: 'from-blue-500 to-cyan-600',
  PRODUCT_DELETED: 'from-red-500 to-rose-600', PLAN_CHANGED: 'from-violet-500 to-purple-600',
  ADDON_PURCHASED: 'from-amber-500 to-orange-600',
};

const ACTOR_LABELS: Record<string, string> = { AI: 'AI Asistan', STAFF: 'Personel', SYSTEM: 'Sistem', HUMAN: 'Müşteri', CUSTOMER: 'Müşteri' };

const CATEGORY_FILTERS = [
  { value: '', label: 'Tüm İşlemler' },
  { value: 'orders', label: 'Siparişler', events: ['ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_SHIPPED', 'ORDER_CANCELLED', 'STATUS_NEW', 'STATUS_UPDATED', 'PAYMENT_CONFIRMED', 'PAYMENT_WAITING', 'CARGO_REMINDER', 'PRINT_REQUESTED'] },
  { value: 'users', label: 'Kullanıcı Hareketleri', events: ['USER_CREATED', 'USER_DELETED'] },
  { value: 'products', label: 'Ürün & Stok', events: ['PRODUCT_CREATED', 'PRODUCT_DELETED'] },
  { value: 'subscription', label: 'Abonelik & Ödeme', events: ['PLAN_CHANGED', 'ADDON_PURCHASED'] },
  { value: 'settings', label: 'Sistem Ayarları', events: ['SETTINGS_UPDATED'] },
  { value: 'issues', label: 'Şikayet & Müdahale', events: ['HUMAN_REQUIRED', 'COMPLAINT_OPEN'] },
];

interface LogEntry {
  id: string; created_at: string; event_type: string; description: string;
  entity_type: string; entity_id: string; actor_type: string; metadata?: Record<string, unknown>;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [search, setSearch] = useState('');
  const tid = getTenantId();

  useEffect(() => { loadLogs(); }, [filterCategory, filterDate]);

  const loadLogs = async () => {
    const params = new URLSearchParams({ limit: '200' });
    if (filterDate) params.set('from', filterDate);
    try {
      const res = await fetch(`/api/activity-log/${tid}?${params.toString()}`, { headers: authHeaders() });
      const data = await res.json();
      const list = Array.isArray(data) && data.length > 0 ? data : getMockLogs();
      setLogs(list);
    } catch { setLogs(getMockLogs()); }
  };

  const getMockLogs = (): LogEntry[] => [
    { id: 'm1', created_at: new Date(Date.now() - 300000).toISOString(), event_type: 'ORDER_CREATED', description: 'AI Asistan 1.780 TL sipariş oluşturdu (WhatsApp)', entity_type: 'order', entity_id: '26-00001', actor_type: 'AI' },
    { id: 'm2', created_at: new Date(Date.now() - 600000).toISOString(), event_type: 'PLAN_CHANGED', description: 'Paket Pro Esnaf (Aylık) olarak değiştirildi', entity_type: 'subscription', entity_id: '', actor_type: 'STAFF' },
    { id: 'm3', created_at: new Date(Date.now() - 900000).toISOString(), event_type: 'PAYMENT_CONFIRMED', description: '#26-00001 ödeme onaylandı (IBAN)', entity_type: 'order', entity_id: '26-00001', actor_type: 'STAFF' },
    { id: 'm4', created_at: new Date(Date.now() - 1800000).toISOString(), event_type: 'PRODUCT_CREATED', description: 'Dana Parmak Sucuk ürünü eklendi', entity_type: 'product', entity_id: '', actor_type: 'STAFF' },
    { id: 'm5', created_at: new Date(Date.now() - 2700000).toISOString(), event_type: 'SETTINGS_UPDATED', description: 'Ayarlar güncellendi (çalışma saatleri, ai_style)', entity_type: 'settings', entity_id: '', actor_type: 'STAFF' },
    { id: 'm6', created_at: new Date(Date.now() - 3600000).toISOString(), event_type: 'ORDER_CREATED', description: 'AI Asistan 2.400 TL sipariş oluşturdu (Telefon)', entity_type: 'order', entity_id: '26-00002', actor_type: 'AI' },
    { id: 'm7', created_at: new Date(Date.now() - 4500000).toISOString(), event_type: 'USER_CREATED', description: 'Mehmet Demir (manager) kullanıcısı oluşturuldu', entity_type: 'user', entity_id: '', actor_type: 'STAFF' },
    { id: 'm8', created_at: new Date(Date.now() - 7200000).toISOString(), event_type: 'ORDER_SHIPPED', description: '#25-00020 kargoya verildi (MNG Kargo)', entity_type: 'order', entity_id: '25-00020', actor_type: 'STAFF' },
    { id: 'm9', created_at: new Date(Date.now() - 10800000).toISOString(), event_type: 'USER_DELETED', description: 'Ahmet Yılmaz hesabı silindi', entity_type: 'user', entity_id: '', actor_type: 'STAFF' },
    { id: 'm10', created_at: new Date(Date.now() - 14400000).toISOString(), event_type: 'ADDON_PURCHASED', description: '+50 Ek Sipariş ek paket satın alındı', entity_type: 'subscription', entity_id: '', actor_type: 'STAFF' },
    { id: 'm11', created_at: new Date(Date.now() - 21600000).toISOString(), event_type: 'PRODUCT_DELETED', description: 'Kavurma ürünü silindi', entity_type: 'product', entity_id: '', actor_type: 'STAFF' },
    { id: 'm12', created_at: new Date(Date.now() - 28800000).toISOString(), event_type: 'ORDER_CANCELLED', description: '#25-00015 sipariş iptal edildi', entity_type: 'order', entity_id: '25-00015', actor_type: 'STAFF' },
  ];

  const catCfg = CATEGORY_FILTERS.find(c => c.value === filterCategory);
  const filtered = logs.filter((l) => {
    if (filterCategory && catCfg?.events && !catCfg.events.includes(l.event_type)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (l.description || '').toLowerCase().includes(q) || (l.event_type || '').toLowerCase().includes(q);
  });

  return (
    <div className="p-4 md:p-6 space-y-5 w-full">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History size={22} className="text-indigo-500" /> Sistem Logları
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tüm sistem hareketleri ve işlem kayıtları</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Log veya kullanıcı ara..."
            className="pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 w-56" />
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={13} className="text-slate-400" />
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
            className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900" />
          {filterDate && <button onClick={() => setFilterDate('')} className="text-[10px] text-indigo-500 font-medium">Temizle</button>}
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900">
          {CATEGORY_FILTERS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <span className="text-[11px] text-slate-400 ml-auto bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-full">{filtered.length} kayıt</span>
      </div>

      {/* Log Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[130px]">Tarih</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">İşlem</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[130px]">İşlemi Yapan</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Açıklama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {filtered.map((log) => {
                const Icon = EVENT_ICONS[log.event_type] || History;
                const gradient = EVENT_GRADIENT[log.event_type] || 'from-slate-400 to-slate-500';
                const actor = ACTOR_LABELS[log.actor_type] || log.actor_type || 'Sistem';
                const isAI = log.actor_type === 'AI';
                return (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    <div>{new Date(log.created_at).toLocaleDateString('tr-TR')}</div>
                    <div className="text-[10px]">{new Date(log.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${gradient} shadow-sm`}>
                      <Icon size={10} /> {EVENT_LABELS[log.event_type] || log.event_type}
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      isAI ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800' :
                      'bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
                    }`}>
                      {isAI ? <Bot size={10} /> : <User size={10} />}
                      {actor}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 max-w-md truncate">{log.description || '—'}</td>
                </tr>
              )})}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-400">
                  <History size={24} className="mx-auto mb-2 opacity-40" />
                  Henüz sistem kaydı bulunmuyor
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
