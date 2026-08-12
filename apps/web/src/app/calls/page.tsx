'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Phone, PhoneCall, Clock, Search, ChevronDown, ChevronUp, Play, Pause, MessageCircle, User, Bot, AlertTriangle, Heart, ShoppingBag, MapPin, CreditCard, X, Instagram, MessageSquare, Sparkles, Mic, CheckCheck } from 'lucide-react';
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

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ---- Özel Ses Oynatıcı ----
function CustomAudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoad = () => setDuration(audio.duration);
    const onEnd = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoad);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoad);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const setSpeedValue = (s: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = s;
    setSpeed(s);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 space-y-3">
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <button onClick={togglePlay} className="bg-blue-500 text-white shadow-md hover:bg-blue-600 p-3 rounded-full transition-all hover:scale-105">
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>

        {/* Waveform bars */}
        <div className="flex-1 flex items-center gap-1" onClick={seek}>
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="flex-1 rounded-full bg-blue-200 dark:bg-blue-800 transition-all cursor-pointer" style={{ height: `${8 + Math.sin(i * 0.7) * 6 + Math.random() * 12}px`, opacity: i / 24 <= currentTime / (duration || 1) ? 1 : 0.4 }} />
          ))}
        </div>

        {/* Duration */}
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums min-w-[80px] text-right">
          {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
        </span>

        {/* Speed */}
        <div className="flex gap-0.5">
          {[1, 1.5, 2].map((s) => (
            <button key={s} onClick={() => setSpeedValue(s)}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${speed === s ? 'bg-blue-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200'}`}>
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full cursor-pointer overflow-hidden" onClick={seek}>
        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-100" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---- Kanala Özel Konuşma Metni ----
function TranscriptView({ transcript, channel, whatsappMessages }: { transcript?: { user_message: string; raw_response: string; confidence: number; created_at: string }[]; channel: string; whatsappMessages?: { id: string; direction: string; body: string; mediaUrl?: string; createdAt: string }[] }) {

  /* WhatsApp */
  if (channel === 'WHATSAPP') {
    const messages = whatsappMessages && whatsappMessages.length > 0
      ? whatsappMessages.map(m => ({ role: m.direction === 'outgoing' ? 'ai' : 'customer', content: m.body, time: m.createdAt }))
      : (transcript || []).map(t => ({ role: t.raw_response ? 'customer' : 'ai', content: t.user_message, time: t.created_at }));

    return (
      <div className="rounded-xl p-4 space-y-2 max-h-96 overflow-y-auto" style={{ backgroundColor: '#efeae2' }}>
        {messages.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Konuşma metni bulunamadı</p> : messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'ai' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 shadow-sm ${m.role === 'ai' ? 'bg-[#d9fdd3]' : 'bg-white'}`}>
              <p className="text-xs leading-relaxed text-slate-800">{m.content}</p>
              <div className="flex items-center gap-1 mt-1.5 justify-end">
                <span className="text-[9px] text-slate-400">{formatTime(m.time)}</span>
                <CheckCheck size={11} className="text-blue-400" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* Instagram */
  if (channel === 'INSTAGRAM') {
    const messages = (transcript || []).map(t => ({ role: t.raw_response ? 'customer' : 'ai', content: t.user_message, time: t.created_at }));
    return (
      <div className="bg-white dark:bg-slate-850 rounded-xl p-4 space-y-3 max-h-96 overflow-y-auto">
        {messages.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Konuşma metni bulunamadı</p> : messages.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.role === 'ai' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'customer' && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shrink-0">
                <User size={12} className="text-white" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.role === 'ai' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
              <p className="text-xs leading-relaxed">{m.content}</p>
            </div>
            {m.role === 'ai' && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                <Bot size={12} className="text-white" />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  /* SMS */
  if (channel === 'SMS') {
    const messages = (transcript || []).map(t => ({ role: t.raw_response ? 'customer' : 'ai', content: t.user_message, time: t.created_at }));
    return (
      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-3 max-h-96 overflow-y-auto">
        {messages.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Konuşma metni bulunamadı</p> : messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'ai' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 ${m.role === 'ai' ? 'bg-sky-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200/60 dark:border-slate-700/60'}`}>
              <p className="text-xs leading-relaxed">{m.content}</p>
              <p className="text-[9px] mt-1 opacity-60">{formatTime(m.time)}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* VOICE / Telefon — timestamp dialogları */
  const messages = (transcript || []).map((t, i) => ({
    role: t.raw_response ? 'customer' : 'assistant',
    content: t.user_message,
    time: t.created_at,
    index: i,
  }));

  const timeInSeconds = (d: string) => new Date(d).getTime() / 1000;
  const startSec = messages.length > 0 ? timeInSeconds(messages[0].time) - 5 : 0;

  return (
    <div className="space-y-1.5 max-h-96 overflow-y-auto">
      {messages.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Konuşma metni bulunamadı</p> : messages.map((m) => {
        const sec = Math.max(0, Math.floor(timeInSeconds(m.time) - startSec));
        const ts = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
        return (
          <div key={m.index} className={`flex items-start gap-2 ${m.role === 'assistant' ? '' : 'pl-4'}`}>
            <span className="text-[10px] font-mono text-slate-400 shrink-0 w-12 text-right">{ts}</span>
            <span className={`text-[10px] font-semibold shrink-0 w-16 ${m.role === 'assistant' ? 'text-indigo-500' : 'text-amber-600'}`}>
              {m.role === 'assistant' ? 'AI Asistan' : 'Müşteri'}
            </span>
            <span className="text-xs text-slate-700 dark:text-slate-300">— {m.content}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function CallsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedChannel, setExpandedChannel] = useState<string>('');
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
      setExpandedId(null); setExpandedChannel(''); setDetail(null);
      return;
    }
    setExpandedId(conv.id);
    setExpandedChannel(conv.channel);
    setActiveTab('list');
    await fetchDetail(conv.id);
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
        c.phone.includes(q) || (c.sessionLabel || '').toLowerCase().includes(q) ||
        (s?.shortSummary || '').toLowerCase().includes(q) || (s?.customer_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Phone size={22} className="text-indigo-500" /> Görüşmeler
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tüm telefon görüşmeleri ve mesajlaşma kanalları</p>
      </div>

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
              <button onClick={() => toggleExpand(conv)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${channelCfg.gradient} flex items-center justify-center shrink-0 ${channelCfg.shadow}`}>
                  <ChIcon size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{summary?.customer_name || (conv as any).username || conv.phone}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${channelCfg.badgeBg} text-white shadow-sm`}>
                      <ChIcon size={9} /> {channelCfg.label}
                    </span>
                    {summary?.sentiment && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sentimentCfg.bg} ${sentimentCfg.text} shadow-sm`}>
                        <SentIcon size={9} /> {sentimentCfg.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>{conv.phone}</span>
                    {conv.type === 'call' && conv.duration && <span className="flex items-center gap-1"><Clock size={10} /> {formatDuration(conv.duration)}</span>}
                    <span>{formatDate(conv.createdAt)}</span>
                  </div>
                  {summary?.shortSummary && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">{summary.shortSummary}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conv.status === 'COMPLETED' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : conv.status === 'FAILED' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    {STATUS_LABELS[conv.status] || conv.status}
                  </span>
                  {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-700">
                  {detailLoading ? (
                    <div className="p-6 text-center text-sm text-slate-400">Yükleniyor...</div>
                  ) : (
                    <div>
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
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {summary?.products && summary.products.length > 0 && (
                                <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3 hover:shadow-sm transition-shadow">
                                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm shadow-blue-500/20 mb-2"><ShoppingBag size={14} className="text-white" /></div>
                                  <p className="text-[10px] text-slate-400">Ürünler</p>
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{summary.products.join(', ')}</p>
                                </div>
                              )}
                              {summary?.payment_method && summary.payment_method !== 'BELIRSIZ' && (
                                <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3 hover:shadow-sm transition-shadow">
                                  <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center shadow-sm shadow-purple-500/20 mb-2"><CreditCard size={14} className="text-white" /></div>
                                  <p className="text-[10px] text-slate-400">Ödeme</p>
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{summary.payment_method}</p>
                                </div>
                              )}
                              {summary?.address && (
                                <div className="bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3 hover:shadow-sm transition-shadow">
                                  <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center shadow-sm shadow-rose-500/20 mb-2"><MapPin size={14} className="text-white" /></div>
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

                            {summary?.shortSummary && (
                              <div className="bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-blue-50/80 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-blue-950/30 border border-indigo-100/80 dark:border-indigo-800/40 rounded-xl p-3.5">
                                <p className="text-xs text-indigo-900 dark:text-indigo-200 font-bold flex items-center gap-1.5 mb-1"><Sparkles size={12} /> AI Özeti</p>
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{summary.shortSummary}</p>
                              </div>
                            )}
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
                            {detail?.recording?.recording_url && <CustomAudioPlayer src={detail.recording.recording_url} />}
                          </>
                        ) : (
                          <TranscriptView transcript={detail?.transcript} channel={expandedChannel} whatsappMessages={detail?.whatsappMessages} />
                        )}
                      </div>
                    </div>
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
