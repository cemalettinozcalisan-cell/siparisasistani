'use client';

import { useEffect, useState, useCallback } from 'react';
import { Phone, PhoneCall, Clock, Search, ChevronDown, ChevronUp, Play, Pause, MessageCircle, User, Bot, AlertTriangle, Frown, Smile, Meh, Heart, ShoppingBag, MapPin, CreditCard, X, Instagram, MessageSquare } from 'lucide-react';
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

const SENTIMENT_MAP: Record<string, { icon: typeof Smile; label: string; color: string }> = {
  HAPPY: { icon: Heart, label: 'Memnun', color: 'text-emerald-600 bg-emerald-50' },
  NEUTRAL: { icon: Meh, label: 'Nötr', color: 'text-slate-600 bg-slate-50' },
  UNHAPPY: { icon: Frown, label: 'Memnuniyetsiz', color: 'text-amber-600 bg-amber-50' },
  ANGRY: { icon: AlertTriangle, label: 'Riskli', color: 'text-red-600 bg-red-50' },
};

const STATUS_BADGES: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  FAILED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  TIMEOUT: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  HUMAN_TRANSFER: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  AI_SPEAKING: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  RINGING: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  ANSWERED: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
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
  const [filter, setFilter] = useState<'all' | 'voice' | 'sms' | 'whatsapp' | 'instagram'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CallDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);
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
    setAudioPlaying(null);
    if (conv.type === 'call' || conv.type === 'sms') {
      await fetchDetail(conv.id);
    }
  };

  const filtered = conversations
    .filter(c => {
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
          (s?.summary || '').toLowerCase().includes(q) ||
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
          Tüm telefon görüşmeleri ve WhatsApp konuşmaları
        </p>
      </div>

      {/* Filter + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
          {[
            { key: 'all' as const, label: 'Tümü' },
            { key: 'voice' as const, label: 'Telefon' },
            { key: 'whatsapp' as const, label: 'WhatsApp' },
            { key: 'sms' as const, label: 'SMS' },
            { key: 'instagram' as const, label: 'Instagram' },
          ].map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${filter === t.key ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Numara, isim veya içerik ara..."
            className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
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
          const sentiment = SENTIMENT_MAP[summary?.sentiment] || SENTIMENT_MAP.NEUTRAL;
          const SentIcon = sentiment.icon;
          const isExpanded = expandedId === conv.id;

          return (
            <div key={conv.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all">
              {/* Row */}
              <button onClick={() => toggleExpand(conv)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  conv.type === 'call' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                  conv.type === 'whatsapp' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                  conv.type === 'sms' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                  'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}>
                  {conv.type === 'call' ? <PhoneCall size={18} /> :
                   conv.type === 'whatsapp' ? <MessageCircle size={18} /> :
                   conv.type === 'sms' ? <MessageSquare size={18} /> :
                   <Instagram size={18} />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {summary?.customer_name || conv.phone}
                    </span>
                    {summary?.sentiment && (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${sentiment.color}`}>
                        <SentIcon size={10} /> {sentiment.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>{(conv as any).username || conv.phone}</span>
                    {conv.type === 'call' && conv.duration && (
                      <span className="flex items-center gap-1"><Clock size={10} /> {formatDuration(conv.duration)}</span>
                    )}
                    <span>{formatDate(conv.createdAt)}</span>
                  </div>
                  {summary?.shortSummary && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">{summary.shortSummary}</p>
                  )}
                </div>

                {/* Badge + Chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGES[conv.status] || 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
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
                          { key: 'transcript' as const, label: 'Transkript' },
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
                            {/* Summary Icon Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {summary?.products && summary.products.length > 0 && (
                                <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                  <ShoppingBag size={14} className="text-indigo-500 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-slate-400">Ürünler</p>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{summary.products.join(', ')}</p>
                                  </div>
                                </div>
                              )}
                              {summary?.payment_method && summary.payment_method !== 'BELIRSIZ' && (
                                <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                  <CreditCard size={14} className="text-emerald-500 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-slate-400">Ödeme</p>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{summary.payment_method}</p>
                                  </div>
                                </div>
                              )}
                              {summary?.address && (
                                <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                  <MapPin size={14} className="text-rose-500 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-slate-400">Adres</p>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{summary.address}</p>
                                  </div>
                                </div>
                              )}
                              {summary?.sentiment_score && (
                                <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${summary.sentiment === 'HAPPY' ? 'bg-emerald-100 text-emerald-600' : summary.sentiment === 'UNHAPPY' || summary.sentiment === 'ANGRY' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                    {summary.sentiment_score}%
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-slate-400">Memnuniyet</p>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{sentiment.label}</p>
                                  </div>
                                </div>
                              )}
                              {summary?.needs_human && (
                                <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/10 rounded-lg col-span-2">
                                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                                  <p className="text-xs text-red-600 dark:text-red-400">İnsan müdahalesi gerekli</p>
                                </div>
                              )}
                            </div>

                            {/* Short Summary */}
                            {summary?.shortSummary && (
                              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                <p className="text-xs text-indigo-800 dark:text-indigo-200 font-medium">AI Özeti</p>
                                <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">{summary.shortSummary}</p>
                              </div>
                            )}

                            {/* AI Errors */}
                            {summary?.ai_errors && summary.ai_errors.length > 0 && (
                              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
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
                              <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-2">
                                  <Play size={12} /> Ses Kaydı
                                </p>
                                <audio controls className="w-full h-8" src={detail.recording.recording_url}>
                                  Tarayıcınız ses kaydını desteklemiyor.
                                </audio>
                              </div>
                            )}
                          </>
                        ) : (
                          /* Transcript Tab */
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
                              <p className="text-xs text-slate-400 text-center py-4">Transkript bulunamadı</p>
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
