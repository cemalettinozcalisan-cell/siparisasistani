'use client';

import { useState } from 'react';
import {
  Bot, User, Search, Loader2, ChevronDown, Clock, Zap,
  Brain, CheckCircle, Truck, Package, XCircle,
  ShoppingBag, MapPin, CreditCard, Phone, Hash, Calendar, Play
} from 'lucide-react';

interface ReplayData {
  order?: { id?: string; order_number?: string; total?: number; status?: string; created_at?: string; customer_name?: string; customer_phone?: string; customer_city?: string; payment_method?: string };
  transcript?: { role: string; content: string }[];
  audits?: { confidence?: number; success?: boolean; model?: string; latency_ms?: number }[];
  timeline?: { event_type?: string; description?: string; created_at?: string }[];
  error?: string;
}

const DEMO_ORDERS = [
  { id: 'ord-016', label: 'ord-016 — 2 kg Kangal Sucuk (Konya)' },
  { id: 'ord-017', label: 'ord-017 — 2 kg Acılı Sucuk (Aydın)' },
  { id: 'ord-019', label: 'ord-019 — Pastırma+Kangal+Haşhaş (Afyon)' },
  { id: 'ord-020', label: 'ord-020 — 2 kg Dana Parmak Sucuk (Ankara)' },
  { id: 'ord-021', label: 'ord-021 — Acılı Sucuk (İzmir)' },
];

const STATUS_LABELS: Record<string, string> = {
  new: 'Yeni', PAYMENT_WAITING: 'Ödeme Bekliyor', CONFIRMED: 'Onaylandı',
  PAYMENT_CONFIRMED: 'Onaylandı', PACKAGED: 'Paketlendi', SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim Edildi', COMPLETED: 'Tamamlandı', CANCELLED: 'İptal',
};

const TIMELINE_ICONS: Record<string, typeof CheckCircle> = {
  ORDER_CREATED: ShoppingBag, PAYMENT_CONFIRMED: CreditCard, PACKAGED: Package,
  SHIPPED: Truck, DELIVERED: CheckCircle, CANCELLED: XCircle,
};

function formatTL(n?: number) { return n ? `${n.toLocaleString('tr-TR')} TL` : '-'; }

export default function ReplayPage() {
  const [orderId, setOrderId] = useState('');
  const [data, setData] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const load = async (id?: string) => {
    const oid = id || orderId;
    if (!oid) return;
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/replay/order/${oid}`),
        fetch(`/api/replay/conversation/${oid}`),
      ]);
      const replay = await r1.json();
      const conv = await r2.json();
      setData({ ...replay, ...conv });
    } catch { setData({ error: 'Yuklenemedi' }); }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
            <Play size={16} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Konuşma Tekrarı (Replay)</h1>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
          Sipariş ID girerek AI-müşteri konuşmasını ve sipariş zaman çizelgesini izleyin
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Sipariş ID (örn: ord-016)"
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none"
            />
          </div>
          <button
            onClick={() => load()}
            disabled={loading || !orderId}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
            {loading ? 'Yükleniyor...' : 'İzle'}
          </button>
        </div>
        <details className="relative sm:w-64">
          <summary className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-gray-500 bg-white dark:bg-slate-800 cursor-pointer flex items-center justify-between">
            Demo siparişler <ChevronDown size={14} />
          </summary>
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
            {DEMO_ORDERS.map((d) => (
              <button key={d.id} onClick={() => { setOrderId(d.id); load(d.id); }}
                className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                {d.label}
              </button>
            ))}
          </div>
        </details>
      </div>

      {data?.error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600">{data.error}</div>
      )}

      {data && !data.error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main: Conversation + Order Info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Order Summary Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Hash size={15} className="text-indigo-500" />
                  {data.order?.order_number || orderId}
                </h2>
                {data.order?.status && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    {STATUS_LABELS[data.order.status] || data.order.status}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                {data.order?.customer_name && (
                  <div className="flex items-center gap-1.5 text-gray-500"><User size={13} /> {data.order.customer_name}</div>
                )}
                {data.order?.customer_phone && (
                  <div className="flex items-center gap-1.5 text-gray-500"><Phone size={13} /> {data.order.customer_phone}</div>
                )}
                {data.order?.customer_city && (
                  <div className="flex items-center gap-1.5 text-gray-500"><MapPin size={13} /> {data.order.customer_city}</div>
                )}
                {data.order?.payment_method && (
                  <div className="flex items-center gap-1.5 text-gray-500"><CreditCard size={13} /> {data.order.payment_method}</div>
                )}
                {data.order?.total && (
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-600">{formatTL(data.order.total)}</div>
                )}
                {data.order?.created_at && (
                  <div className="flex items-center gap-1.5 text-gray-400"><Calendar size={13} /> {new Date(data.order.created_at).toLocaleDateString('tr-TR')}</div>
                )}
              </div>
            </div>

            {/* Conversation Transcript */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2">
                  <Bot size={15} className="text-violet-500" /> Konuşma
                </h3>
                <label className="flex items-center gap-1.5 text-[10px] text-gray-400 cursor-pointer">
                  <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="w-3 h-3" /> Otomatik kaydır
                </label>
              </div>
              <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto" ref={(el) => { if (el && autoScroll) setTimeout(() => el.scrollTop = el.scrollHeight, 50); }}>
                {(data.transcript || []).map((msg, i) => {
                  const isCustomer = msg.role === 'customer';
                  return (
                    <div key={i} className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] space-y-1`}>
                        <div className={`flex items-end gap-2 ${isCustomer ? 'flex-row' : 'flex-row-reverse'}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isCustomer ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-violet-50 dark:bg-violet-900/20'}`}>
                            {isCustomer ? <User size={14} className="text-emerald-600" /> : <Bot size={14} className="text-violet-600" />}
                          </div>
                          <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isCustomer ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-md' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-800 dark:text-violet-200 rounded-br-md'}`}>
                            {msg.content}
                          </div>
                        </div>
                        {!isCustomer && data.audits?.[i] && (
                          <div className="flex justify-end gap-3">
                            {data.audits[i].confidence != null && (
                              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${(data.audits[i].confidence ?? 0) >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                %{data.audits[i].confidence} güven
                              </span>
                            )}
                            {data.audits[i].model && (
                              <span className="text-[9px] text-gray-400 flex items-center gap-1"><Brain size={10} /> {data.audits[i].model}</span>
                            )}
                            {data.audits[i].latency_ms && (
                              <span className="text-[9px] text-gray-400 flex items-center gap-1"><Clock size={10} /> {data.audits[i].latency_ms}ms</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(!data.transcript || data.transcript.length === 0) && (
                  <div className="text-center text-xs text-gray-400 py-8">Konuşma verisi bulunamadı</div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: Timeline + Stats */}
          <div className="space-y-4">
            {/* AI Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Brain size={14} className="text-violet-500" /> AI Metrikleri
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold text-violet-600">%{data.audits?.[0]?.confidence ?? '-'}</div>
                  <div className="text-[9px] text-gray-400">Güven</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold text-blue-600">{data.audits?.[0]?.latency_ms ?? '-'}ms</div>
                  <div className="text-[9px] text-gray-400">Gecikme</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold text-emerald-600">{data.audits?.[0]?.model?.replace('deepseek-', '') ?? '-'}</div>
                  <div className="text-[9px] text-gray-400">Model</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold text-amber-600">{data.transcript?.filter(m => m.role === 'customer')?.length ?? 0}</div>
                  <div className="text-[9px] text-gray-400">Mesaj</div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {data.timeline && data.timeline.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock size={14} className="text-indigo-500" /> Olay Zaman Çizelgesi
                </h3>
                <div className="space-y-0">
                  {data.timeline.map((ev, i) => {
                    const Icon = TIMELINE_ICONS[ev.event_type || ''] || CheckCircle;
                    return (
                      <div key={i} className="flex gap-3 pb-3 relative">
                        {i < data.timeline!.length - 1 && <div className="absolute left-[11px] top-6 w-px h-full bg-slate-200 dark:bg-slate-700" />}
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mt-0.5">
                          <Icon size={13} className="text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-gray-700 dark:text-slate-200">{ev.description || ev.event_type}</p>
                          {ev.created_at && (
                            <p className="text-[9px] text-gray-400 mt-0.5">{new Date(ev.created_at).toLocaleString('tr-TR')}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
