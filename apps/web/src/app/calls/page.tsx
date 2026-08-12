'use client';

import { useEffect, useState, useCallback } from 'react';
import { Phone, PhoneCall, Clock, Search, ChevronDown, ChevronUp, Play, Pause, MessageCircle, User, Bot, AlertTriangle, Heart, ShoppingBag, MapPin, CreditCard, X, Instagram, MessageSquare, Sparkles, Mic } from 'lucide-react';
import { getTenantId } from '@/lib/tenant';

interface Conversation {
  id: string; type: string; channel: string; phone: string;
  username?: string; sessionLabel?: string; status: string; duration?: number;
  recordingUrl?: string; aiModel?: string; hasOrder: boolean;
  orderInfo?: { description?: string; metadata?: Record<string, unknown> };
  summary?: string | Record<string, unknown>;
  createdAt: string; endedAt?: string;
}

interface CallDetail {
  session: Record<string, unknown>;
  recording?: { recording_url?: string } | null;
  transcript?: { user_message: string; raw_response: string; confidence: number; created_at: string }[];
  whatsappMessages?: { id: string; direction: string; body: string; mediaUrl?: string; createdAt: string }[];
}

function parseSummary(raw: unknown) {
  if (!raw) return null;
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
}

const CHANNEL_CONFIG = [
  { key: 'voice', type: 'call', label: 'Telefon', icon: PhoneCall, gradient: 'from-blue-500 to-blue-600', borderLeft: 'border-l-blue-500', shadow: 'shadow-blue-500/20', badgeBg: 'bg-blue-500' },
  { key: 'whatsapp', type: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, gradient: 'from-emerald-400 to-emerald-600', borderLeft: 'border-l-emerald-500', shadow: 'shadow-emerald-500/20', badgeBg: 'bg-emerald-500' },
  { key: 'sms', type: 'sms', label: 'SMS', icon: MessageSquare, gradient: 'from-sky-400 to-blue-500', borderLeft: 'border-l-sky-400', shadow: 'shadow-sky-400/20', badgeBg: 'bg-sky-400' },
  { key: 'instagram', type: 'instagram', label: 'Instagram', icon: Instagram, gradient: 'from-pink-500 to-purple-600', borderLeft: 'border-l-pink-500', shadow: 'shadow-pink-500/20', badgeBg: 'bg-pink-500' },
];

const SENTIMENT_CONFIG: Record<string, { icon: typeof Heart; label: string; bg: string; text: string }> = {
  HAPPY: { icon: Heart, label: 'Memnun', bg: 'bg-emerald-500', text: 'text-white' },
  NEUTRAL: { icon: Heart, label: 'Nötr', bg: 'bg-slate-400', text: 'text-white' },
  UNHAPPY: { icon: AlertTriangle, label: 'Memnuniyetsiz', bg: 'bg-amber-500', text: 'text-white' },
  ANGRY: { icon: AlertTriangle, label: 'Riskli', bg: 'bg-rose-500', text: 'text-white' },
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Tamamlandı', FAILED: 'Başarısız', TIMEOUT: 'Zaman Aşımı',
  HUMAN_TRANSFER: 'Yetkiliye Aktarıldı', AI_SPEAKING: 'AI Konuşuyor',
  RINGING: 'Çalıyor', ANSWERED: 'Cevaplandı',
};

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function CallsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CallDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tid, setTid] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'transcript'>('list');

  useEffect(() => { setTid(getTenantId()); }, []);

  const load = useCallback(async () => {
    if (!tid) return;
    try {
      const res = await fetch(`/api/conversations/${tid}?limit=100`);
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  }, [tid]);

  useEffect(() => { load(); }, [load]);

  const fetchDetail = async (sessionId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/conversations/detail/${tid}/${sessionId}`);
      setDetail(await res.json());
    } catch { setDetail(null); }
    setDetailLoading(false);
  };

  const toggleExpand = async (conv: Conversation) => {
    if (expandedId === conv.id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(conv.id);
    if (conv.type === 'call' || conv.type === 'sms') {
      await fetchDetail(conv.id);
    }
  };

  const filtered = conversations.filter(c => {
    if (filter === 'voice' && c.type !== 'call') return false;
    if (filter === 'whatsapp' && c.type !== 'whatsapp') return false;
    if (filter === 'sms' && c.type !== 'sms') return false;
    if (filter === 'instagram' && c.type !== 'instagram') return false;
    if (search) {
      const q = search.toLowerCase();
      const s = parseSummary(c.summary);
      return (
        c.phone.includes(q) ||
        (c.sessionLabel || '').toLowerCase().includes(q) ||
        (s?.shortSummary || '').toLowerCase().includes(q) ||
        (s?.customer_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Phone size={22} className="text-indigo-500" /> Görüşmeler
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Tüm telefon görüşmeleri ve mesajlaşma kanalları
        </p>
      </div>

      {/* Filter Pills + Search — Aktif Siparişler tarzı */}
      <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm">
        <button onClick={() => setFilter('all')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === 'all' ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md scale-105' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200'}`}>
          Tümü
        </button>
        {CHANNEL_CONFIG.map((c) => {
          const Icon = c.icon;
          const isActive = filter === c.key;
          return (
            <button key={c.key} onClick={() => setFilter(isActive ? 'all' : c.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all bg-gradient-to-r ${c.gradient} text-white shadow-sm ${isActive ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-white/50 scale-105' : ''}`}>
              <Icon size={14} /> {c.label}
            </button>
          );
        })}
        <div className="relative flex-1 min-w-[140px] ml-auto">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Numara, isim veya içerik ara..."
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-full text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-indigo-400 outline-none" />
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <Phone size={28} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-500">Henüz görüşme bulunmuyor</p>
          </div>
        ) : filtered.map(conv => {
          const summary = parseSummary(conv.summary);
          const sentimentCfg = SENTIMENT_CONFIG[summary?.sentiment] || SENTIMENT_CONFIG.NEUTRAL;
          const SentIcon = sentimentCfg.icon;
          const channelCfg = CHANNEL_CONFIG.find(c => c.type === conv.type) || CHANNEL_CONFIG[0];
          const ChIcon = channelCfg.icon;
          const isExpanded = expandedId === conv.id;

          return (
            <div key={conv.id} className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border-l-4 ${channelCfg.borderLeft}`}>
              {/* Row */}
              <button onClick={() => toggleExpand(conv)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                {/* Kanal ikonu — Raporlar sayfası tarzı dolu renkli kutu */}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${channelCfg.gradient} flex items-center justify-center shrink-0 ${channelCfg.shadow}`}>
                  <ChIcon size={18} className="text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {summary?.customer_name || (conv as any).username || conv.phone}
                    </span>
                    {/* Kanal badge — Aktif Siparişler tarzı canlı pill */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${channelCfg.badgeBg} text-white shadow-sm`}>
                      <ChIcon size={9} /> {channelCfg.label}
                    </span>
                    {/* Duygu badge */}
                    {summary?.sentiment && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sentimentCfg.bg} ${sentimentCfg.text} shadow-sm`}>
                        <SentIcon size={9} /> {sentimentCfg.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>{conv.phone}</span>
                    {conv.type === 'call' && conv.duration && (
                      <span className="flex items-center gap-1"><Clock size={10} /> {formatDuration(conv.duration)}</span>
                    )}
                    <span>{formatDate(conv.createdAt)}</span>
                  </div>
                  {summary?.shortSummary && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">{summary.shortSummary}</p>
                  )}
                </div>

                {/* Status + Chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conv.status === 'COMPLETED' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : conv.status === 'FAILED' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    {STATUS_LABELS[conv.status] || conv.status}
                  </span>
                  {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </button>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-700">
                  {detailLoading ? (
                    <div className="p-6 text-center text-sm text-slate-400">Yükleniyor...</div>
                  ) : detail ? (
                    <div>
                      {/* Tab bar */}
                      <div className="flex gap-0 px-4 pt-3">
                        {[
                          { key: 'list' as const, label: 'Özet & Analiz' },
                          { key: 'transcript' as const, label: 'Konuşma Metni' },
                        ].map(t => (
                          <button key={t.key} onClick={(e) => { e.stopPropagation(); setActiveTab(t.key); }}
                            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${activeTab === t.key ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            {t.label}
                          </button>
                        ))}
                      </div>

                      <div className="p-4 space-y-3">
                        {activeTab === 'list' ? (
                          <>
                            {/* Raporlar sayfası tarzı canlı ikonlu mini kartlar */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {summary?.products && summary.products.length > 0 && (
                                <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3 hover:shadow-sm transition-shadow">
                                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm shadow-blue-500/20 mb-2">
                                    <ShoppingBag size={14} className="text-white" />
                                  </div>
                                  <p className="text-[10px] text-slate-400">Ürünler</p>
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{summary.products.join(', ')}</p>
                                </div>
                              )}
                              {summary?.payment_method && summary.payment_method !== 'BELIRSIZ' && (
                                <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3 hover:shadow-sm transition-shadow">
                                  <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center shadow-sm shadow-purple-500/20 mb-2">
                                    <CreditCard size={14} className="text-white" />
                                  </div>
                                  <p className="text-[10px] text-slate-400">Ödeme</p>
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{summary.payment_method}</p>
                                </div>
                              )}
                              {summary?.address && (
                                <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3 hover:shadow-sm transition-shadow">
                                  <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center shadow-sm shadow-rose-500/20 mb-2">
                                    <MapPin size={14} className="text-white" />
                                  </div>
                                  <p className="text-[10px] text-slate-400">Adres</p>
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{summary.address}</p>
                                </div>
                              )}
                              {summary?.sentiment_score && (
                                <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3 hover:shadow-sm transition-shadow">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm mb-2 ${sentimentCfg.bg}`}>
                                    <SentIcon size={14} className="text-white" />
                                  </div>
                                  <p className="text-[10px] text-slate-400">Memnuniyet</p>
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{summary.sentiment_score}% — {sentimentCfg.label}</p>
                                </div>
                              )}
                              {summary?.needs_human && (
                                <div className="col-span-2 bg-red-50 dark:bg-red-900/10 border border-red-200/60 dark:border-red-800/40 rounded-xl p-3 flex items-center gap-2">
                                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">İnsan müdahalesi gerekli</p>
                                </div>
                              )}
                            </div>

                            {/* AI Özet */}
                            {summary?.shortSummary && (
                              <div className="bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-blue-50/80 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-blue-950/30 border border-indigo-100/80 dark:border-indigo-800/40 rounded-xl p-3.5">
                                <p className="text-xs text-indigo-900 dark:text-indigo-200 font-bold flex items-center gap-1.5 mb-1">
                                  <Sparkles size={12} /> AI Özeti
                                </p>
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{summary.shortSummary}</p>
                              </div>
                            )}

                            {/* AI Errors */}
                            {summary?.ai_errors && summary.ai_errors.length > 0 && (
                              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-3">
                                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium flex items-center gap-1"><AlertTriangle size={12} /> AI Hataları</p>
                                <ul className="mt-1 space-y-0.5">
                                  {summary.ai_errors.map((e: string, i: number) => (
                                    <li key={i} className="text-[11px] text-amber-700 dark:text-amber-300">• {e}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Audio Player */}
                            {detail.recording?.recording_url && (
                              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3">
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5 mb-2">
                                  <Mic size={12} className="text-indigo-500" /> Ses Kaydı
                                </p>
                                <audio controls className="w-full h-8" src={detail.recording.recording_url}>
                                  Tarayıcınız ses kaydını desteklemiyor.
                                </audio>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {detail.transcript && detail.transcript.length > 0 ? (
                              detail.transcript.map((t, i) => (
                                <div key={i} className={`flex gap-2.5 ${t.raw_response ? '' : 'justify-end'}`}>
                                  {t.raw_response && (
                                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                                      <Bot size={13} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                  )}
                                  <div className={`max-w-[80%] ${t.raw_response ? '' : 'order-first'}`}>
                                    <p className="text-[10px] text-slate-400 mb-0.5">{formatDate(t.created_at)}</p>
                                    <div className={`p-2.5 rounded-xl text-xs ${t.raw_response ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200' : 'bg-indigo-600 text-white'}`}>
                                      {t.user_message}
                                    </div>
                                  </div>
                                  {!t.raw_response && (
                                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                                      <User size={13} className="text-amber-600 dark:text-amber-400" />
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400 text-center py-4">Konuşma metni bulunamadı</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm text-slate-400">Detay yüklenemedi</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
