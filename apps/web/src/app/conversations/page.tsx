'use client';

import { useEffect, useState } from 'react';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Record<string, unknown>[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [filter, setFilter] = useState('all');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    fetch(`/api/conversations/${tid}`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setConversations(d);
    }).catch(() => {});
  }, []);

  const filtered = conversations.filter((c) => {
    if (filter === 'voice' && c.channel !== 'VOICE') return false;
    if (filter === 'whatsapp' && c.channel !== 'WHATSAPP') return false;
    if (filter === 'missed' && c.status !== 'missed' && c.status !== 'failed') return false;
    return true;
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    return `${Math.floor(seconds / 60)}dk ${seconds % 60}sn`;
  };

  const getStatusBadge = (c: Record<string, unknown>) => {
    const status = c.status as string;
    if (status === 'active' || status === 'AI_SPEAKING') return { label: '🟢 Devam Ediyor', color: 'bg-green-100 text-green-700' };
    if (status === 'missed' || status === 'failed' || status === 'TIMEOUT') return { label: '🔴 Kacirildi', color: 'bg-red-100 text-red-700' };
    if (status === 'completed' || status === 'COMPLETED') return { label: '✅ Tamamlandi', color: 'bg-green-100 text-green-700' };
    return { label: status, color: 'bg-gray-100 text-gray-600' };
  };

  const selectConversation = async (c: Record<string, unknown>) => {
    setSelected(c);
    setDetail(null);
    setLoadingDetail(true);
    const sessionId = c.id as string;
    if (c.type === 'call') {
      try {
        const res = await fetch(`/api/conversations/detail/${tid}/${sessionId}`);
        const data = await res.json();
        setDetail(data);
      } catch {}
    }
    setLoadingDetail(false);
  };

  // WhatsApp messages from the detail
  const waMessages = (detail?.whatsappMessages as Record<string, unknown>[]) || [];
  const transcript = (detail?.transcript as Record<string, unknown>[]) || [];
  const recording = detail?.recording as Record<string, unknown> | null;

  return (
    <div className="p-4 flex gap-4 h-[calc(100vh-2rem)]">
      <div className="w-2/5 flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Görüşmeler</h1>
          <span className="text-xs text-slate-400">{conversations.length} kayit</span>
        </div>
        <div className="flex gap-1">
          {[{ key: 'all', label: 'Tumu' }, { key: 'voice', label: '📞 Telefon' }, { key: 'whatsapp', label: '💬 WhatsApp' }, { key: 'missed', label: '🔴 Kacirilan' }].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {filtered.map((c) => {
            const badge = getStatusBadge(c);
            return (
              <div key={c.id as string} onClick={() => selectConversation(c)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${selected?.id === c.id ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{c.channel === 'WHATSAPP' ? '💬' : c.status === 'failed' ? '🔴' : '📞'}</span>
                    <span className="font-medium text-sm text-slate-900">{c.phone as string || 'Bilinmiyor'}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${badge.color}`}>{badge.label}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  {c.type === 'call' && <span>⏱ {formatDuration(c.duration as number | null)}</span>}
                  {Boolean(c.sessionLabel) && <span>🆔 {String(c.sessionLabel)}</span>}
                  <span>{new Date(c.createdAt as string).toLocaleString('tr-TR')}</span>
                </div>
                {Boolean(c.lastMessage) && <p className="text-xs text-slate-400 mt-1 truncate">{String(c.lastMessage)}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-3/5">
        {selected ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-5 h-full overflow-y-auto">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selected.channel === 'WHATSAPP' ? '💬 WhatsApp' : '📞 Telefon'} Gorusmesi
                </h2>
                <p className="text-sm text-slate-500">{selected.phone as string}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selected).color}`}>
                {getStatusBadge(selected).label}
              </span>
            </div>

            
            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm">
              <div><span className="text-slate-500">Tarih</span><p className="font-medium text-slate-900 dark:text-white">{new Date(selected.createdAt as string).toLocaleString('tr-TR')}</p></div>
              {Boolean(selected.duration) && <div><span className="text-slate-500">Sure</span><p className="font-medium text-slate-900 dark:text-white">{formatDuration(selected.duration as number | null)}</p></div>}
              {Boolean(selected.sessionLabel) && <div><span className="text-slate-500">Oturum</span><p className="font-medium text-slate-900 dark:text-white">{String(selected.sessionLabel)}</p></div>}
            </div>

            
            {Boolean(recording?.recording_url) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎙</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ses Kaydi</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-1 mb-2 h-6">
                    {[...Array(40)].map((_, i) => (
                      <div key={i} className="w-1 bg-blue-500 rounded-full animate-pulse"
                        style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.05}s`, opacity: 0.6 }} />
                    ))}
                  </div>
                  <audio controls className="w-full" src={recording?.recording_url as string}>
                    Tarayiciniz ses kaydini desteklemiyor.
                  </audio>
                </div>
              </div>
            )}

            
            {waMessages.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💬</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">WhatsApp Sohbeti</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                  {waMessages.map((msg) => (
                    <div key={msg.id as string} className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${msg.direction === 'outgoing' ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-500 rounded-bl-sm'}`}>
                        <p>{String(msg.body)}</p>
                        <p className={`text-[10px] mt-0.5 ${msg.direction === 'outgoing' ? 'text-blue-100' : 'text-slate-400'}`}>
                          {new Date(msg.createdAt as string).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            
            {transcript.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">AI Konusma Dokumu</span>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                  {transcript.slice(0, 10).map((entry, i) => (
                    <div key={i} className="text-xs space-y-1 border-b border-slate-700 last:border-0 pb-2 last:pb-0">
                      {Boolean(entry.user_message) && (
                        <div className="flex gap-2">
                          <span className="text-blue-400 shrink-0">👤 Musteri:</span>
                          <span className="text-slate-300">{(entry.user_message as string).substring(0, 200)}</span>
                        </div>
                      )}
                      {Boolean(entry.raw_response) && (
                        <div className="flex gap-2">
                          <span className="text-green-400 shrink-0">🤖 AI:</span>
                          <span className="text-slate-400">{(() => {
                            try { const j = JSON.parse(entry.raw_response as string); return String(j.reply || entry.raw_response).substring(0, 200); } catch { return (entry.raw_response as string).substring(0, 200); }
                          })()}</span>
                        </div>
                      )}
                      {Boolean(entry.confidence) && (
                        <div className="text-slate-500 mt-0.5">Guven: %{String(entry.confidence)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            
            {loadingDetail && <div className="text-center text-sm text-slate-400 py-4">Yukleniyor...</div>}

            
            {!loadingDetail && selected.type !== 'call' && (
              <div className="text-center py-8 text-slate-400">
                <p className="text-3xl mb-2">💬</p>
                <p className="text-sm">WhatsApp konusma detayi</p>
                <a href={`https://wa.me/${selected.phone}`} target="_blank"
                  className="inline-block mt-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100">
                  💬 WhatsApp'ta Ac
                </a>
              </div>
            )}

            
            <div className="flex gap-2 pt-2">
              <a href={`tel:${selected.phone}`} target="_blank"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100">📞 Geri Ara</a>
              <a href={`https://wa.me/${selected.phone}`} target="_blank"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100">💬 WhatsApp Ac</a>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <p className="text-4xl mb-2">📞</p>
              <p className="text-sm">Detayi gormek icin bir konusma secin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
