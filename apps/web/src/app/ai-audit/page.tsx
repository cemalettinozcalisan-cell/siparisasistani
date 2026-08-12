'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Eye, Bot } from 'lucide-react';
import { getTenantId, getUserRole } from '@/lib/tenant';

interface LogEntry {
  id: string;
  tenantId: string;
  model: string;
  provider: string;
  confidence: number;
  latency: number;
  success: boolean;
  tokens: number;
  userMessage: string;
  createdAt: string;
}

interface Stats {
  total: number;
  successful: number;
  failed: number;
  aiSuccessRate: number;
  avgConfidence: number;
  avgLatency: number;
  totalTokens: number;
  estimatedCost: number;
  modelDistribution: { model: string; count: number; pct: number }[];
  dailyTrend: { date: string; total: number; success: number }[];
  models: string[];
}

interface DetailData {
  system_prompt: string;
  user_message: string;
  raw_response: string;
  error_message: string;
  parsed_json: Record<string, unknown>;
  model: string;
  provider: string;
  confidence: number;
  latency_ms: number;
  success: boolean;
}

const MODEL_COLORS: Record<string, string> = {
  deepseek: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  openai: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  deepseek_chat: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  deepseek_reasoner: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  'gpt-4o': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  'gpt-4o-mini': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  claude: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  bilge_ai: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
};

function modelBadge(model: string) {
  const key = Object.keys(MODEL_COLORS).find((k) => model?.toLowerCase().includes(k)) || '';
  const colors = MODEL_COLORS[key] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
  return `inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors}`;
}

function modelColor(model: string): string {
  const key = Object.keys(MODEL_COLORS).find((k) => model?.toLowerCase().includes(k)) || '';
  if (key === 'deepseek' || key === 'deepseek_chat' || key === 'deepseek_reasoner') return 'bg-blue-500';
  if (key === 'openai' || key === 'gpt-4o' || key === 'gpt-4o-mini') return 'bg-emerald-500';
  if (key === 'claude') return 'bg-amber-500';
  return 'bg-slate-500';
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const JSON_LABELS: Record<string, string> = {
  action: 'Aksiyon',
  confidence: 'Güven Skoru',
  detected_entities: 'Tespit Edilenler',
  customer: 'Müşteri',
  name: 'Adı',
  phone: 'Telefon',
  birthday: 'Doğum Günü',
  company_name: 'Şirket',
  identity_number: 'TC / Vergi No',
  products: 'Ürünler',
  product_name: 'Ürün',
  quantity: 'Miktar',
  unit: 'Birim',
  address: 'Adres',
  payment: 'Ödeme',
  method: 'Yöntem',
  confirmed: 'Onaylandı',
  reply: 'AI Yanıtı',
  needs_human: 'İnsan Müdahalesi Gerekli',
  total: 'Toplam',
  order_number: 'Sipariş No',
};

function renderParsedJson(obj: Record<string, unknown>, depth = 0): string {
  const indent = '  '.repeat(depth);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const label = JSON_LABELS[key] || key;
    if (Array.isArray(value)) {
      lines.push(`${indent}${label}:`);
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          // Product array: format as "{quantity} {unit} {name}"
          const p = item as Record<string, unknown>;
          if (p.product_name && p.quantity) {
            lines.push(`${indent}  • ${p.quantity} ${p.unit || 'adet'} ${p.product_name}`);
          } else {
            lines.push(`${indent}  • ${JSON.stringify(item)}`);
          }
        } else {
          lines.push(`${indent}  • ${item}`);
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${indent}${label}:`);
      lines.push(renderParsedJson(value as Record<string, unknown>, depth + 1));
    } else if (typeof value === 'boolean') {
      lines.push(`${indent}${label}: ${value ? 'Evet' : 'Hayır'}`);
    } else {
      lines.push(`${indent}${label}: ${value ?? '—'}`);
    }
  }
  return lines.join('\n');
}

export default function AiAuditPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('owner');
  const [filters, setFilters] = useState({ from: '', to: '', model: '', status: '' });
  const tid = getTenantId();

  useEffect(() => { setUserRole(getUserRole()); }, []);

  const isOwner = userRole === 'owner';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.model) params.set('model', filters.model);
      if (filters.status) params.set('status', filters.status);

      const [sRes, cRes] = await Promise.all([
        fetch(`/api/ai-audit/stats/${tid}?${params.toString()}`).then((r) => r.json()),
        fetch(`/api/ai-audit/conversations/${tid}?${params.toString()}&limit=200`).then((r) => r.json()),
      ]);
      setStats(sRes);
      if (Array.isArray(cRes)) setLogs(cRes);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/ai-audit/conversations/${tid}/${id}`);
      const data = await res.json();
      setDetail(data as DetailData);
    } catch (e) { console.error(e); }
  };

  // Sparkline mini bar
  const Sparkline = ({ data }: { data: { date: string; total: number; success: number }[] }) => {
    const max = Math.max(...data.map((d) => d.total), 1);
    return (
      <div className="flex items-end gap-0.5 h-8">
        {data.map((d, i) => {
          const h = Math.max(4, (d.total / max) * 100);
          const successH = d.total > 0 ? (d.success / d.total) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end gap-px" title={`${d.date}: ${d.total} (${d.success} başarılı)`}>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-sm" style={{ height: `${h}%`, minHeight: 3 }}>
                <div className="w-full bg-indigo-400 dark:bg-indigo-500 rounded-sm h-full" style={{ opacity: 0.3 + (successH / 300) }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Denetim Merkezi</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">AI konuşma logları, performans metrikleri ve maliyet analizi</p>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className={`grid grid-cols-2 md:grid-cols-3 ${isOwner ? 'lg:grid-cols-6' : 'lg:grid-cols-4'} gap-3`}>
          {[
            { label: 'Toplam Konuşma', value: stats.total, icon: '💬', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', ownerOnly: false },
            { label: 'Başarılı', value: stats.successful, icon: '✅', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', ownerOnly: false },
            { label: 'Hatalı', value: stats.failed, icon: '❌', color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400', border: 'border-red-200 dark:border-red-800', ownerOnly: false },
            { label: 'Başarı Oranı', value: `%${stats.aiSuccessRate}`, icon: '📊', color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800', ownerOnly: false },
            { label: 'Toplam Token', value: formatTokens(stats.totalTokens), icon: '⚡', color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', ownerOnly: true },
            { label: 'Ort. Süre', value: `${stats.avgLatency}ms`, icon: '⏱️', color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', ownerOnly: true },
          ].filter(card => isOwner || !card.ownerOnly).map((card) => (
            <div key={card.label} className={`bg-white dark:bg-slate-800 border ${card.border} rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{card.icon}</span>
                {card.label === 'Ort. Süre' && stats.estimatedCost > 0 && (
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                    ~${stats.estimatedCost.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</div>
              <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Trend & Model Distribution Row — Owner only */}
      {stats && isOwner && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daily Trend */}
          <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">7 Günlük Trend</span>
              <span className="text-[11px] text-gray-400">günlük konuşma hacmi</span>
            </div>
            <Sparkline data={stats.dailyTrend} />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              {stats.dailyTrend.map((d, i) => (
                <span key={i}>{new Date(d.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
              ))}
            </div>
          </div>

          {/* Model Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">Model Dağılımı</span>
            </div>
            {stats.modelDistribution.length === 0 && (
              <p className="text-xs text-gray-400 py-4 text-center">Veri yok</p>
            )}
            <div className="space-y-2">
              {stats.modelDistribution.map((m) => (
                <div key={m.model}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="font-medium text-gray-600 dark:text-slate-400">{m.model}</span>
                    <span className="text-gray-400">%{m.pct}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                    <div className={`h-2 rounded-full ${modelColor(m.model)} transition-all`} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400">Tarih</label>
            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
            <span className="text-xs text-gray-400">—</span>
            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
          </div>
          {stats && (stats.models?.length ?? 0) > 0 && (
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400">Model</label>
              <select value={filters.model} onChange={(e) => setFilters({ ...filters, model: e.target.value })}
                className="px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                <option value="">Tümü</option>
                {stats.models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400">Durum</label>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
              <option value="">Tümü</option>
              <option value="failed">Sadece Başarısız</option>
              <option value="low_confidence">Düşük Güven (&lt;%80)</option>
            </select>
          </div>
          {(filters.from || filters.to || filters.model || filters.status) && (
            <button onClick={() => setFilters({ from: '', to: '', model: '', status: '' })}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium ml-auto">Filtreleri Temizle</button>
          )}
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Tarih</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Mesaj</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Model</th>
                {isOwner && <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Süre</th>}
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Güven</th>
                {isOwner && <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Token</th>}
                <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {loading && (
                <tr><td colSpan={isOwner ? 7 : 5} className="px-3 py-12 text-center text-gray-400 text-sm">Yükleniyor...</td></tr>
              )}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={isOwner ? 7 : 5} className="px-3 py-12 text-center text-gray-400 text-sm">
                  <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />Henüz AI konuşması yok
                </td></tr>
              )}
              {!loading && logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                    <div>{new Date(l.createdAt).toLocaleDateString('tr-TR')}</div>
                    <div className="text-[10px]">{new Date(l.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-3 py-2.5 max-w-xs">
                    <div className="flex items-center gap-1.5">
                      <span>{l.success ? '✅' : '❌'}</span>
                      <span className="text-xs text-gray-700 dark:text-slate-300 truncate">{l.userMessage || '—'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={modelBadge(l.model)}>{l.model}</span>
                  </td>
                  {isOwner && (
                  <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                    {l.latency ? `${l.latency}ms` : '—'}
                  </td>
                  )}
                  <td className="px-3 py-2.5">
                    {l.confidence != null ? (
                      <span className={`inline-flex text-xs font-semibold ${l.confidence >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                        %{l.confidence}
                      </span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  {isOwner && (
                  <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                    {formatTokens(l.tokens)}
                  </td>
                  )}
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => openDetail(l.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                      <Eye className="w-3.5 h-3.5" /> Log Detayı
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-16 overflow-y-auto" onClick={() => setDetail(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Log Detayı</h3>
                {detail.model && <span className={modelBadge(detail.model)}>{detail.model}</span>}
              </div>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Meta */}
              <div className="grid grid-cols-4 gap-2 text-[11px]">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2">
                  <span className="text-gray-400">Güven Skoru</span>
                  <div className={`font-bold ${(detail.confidence || 0) >= 80 ? 'text-emerald-600' : 'text-red-500'}`}>%{detail.confidence || 0}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2">
                  <span className="text-gray-400">Yanıt Süresi</span>
                  <div className="font-bold text-gray-700 dark:text-slate-300">{detail.latency_ms || 0}ms</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2">
                  <span className="text-gray-400">Sağlayıcı</span>
                  <div className="font-bold text-gray-700 dark:text-slate-300">{detail.provider || '—'}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2">
                  <span className="text-gray-400">Durum</span>
                  <div className={`font-bold ${detail.success ? 'text-emerald-600' : 'text-red-500'}`}>{detail.success ? 'Başarılı' : 'Başarısız'}</div>
                </div>
              </div>

              {/* System Prompt — Owner only */}
              {isOwner && detail.system_prompt && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">System Prompt</label>
                  <div className="bg-slate-900 text-slate-300 rounded-lg p-3 text-xs font-mono leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {detail.system_prompt}
                  </div>
                </div>
              )}

              {/* User Message */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Kullanıcı Mesajı</label>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap">
                  {detail.user_message || '—'}
                </div>
              </div>

              {/* AI Response */}
              {detail.raw_response && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">AI Yanıtı</label>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg p-3 text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {detail.raw_response}
                  </div>
                </div>
              )}

              {/* Parsed JSON — Owner only */}
              {isOwner && detail.parsed_json && Object.keys(detail.parsed_json).length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">AI Çıktı Analizi</label>
                  <div className="bg-slate-900 text-slate-300 rounded-lg p-3 text-xs font-mono leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {renderParsedJson(detail.parsed_json)}
                  </div>
                </div>
              )}

              {/* Error */}
              {detail.error_message && (
                <div>
                  <label className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wide mb-1.5 block">Hata Detayı</label>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {detail.error_message}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <button onClick={() => setDetail(null)} className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
