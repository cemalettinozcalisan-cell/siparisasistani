'use client';

import { useEffect, useState } from 'react';
import { Layers, PhoneCall, MessageCircle, AlertTriangle, Camera, PhoneIncoming, User, ExternalLink, Clock, CheckCheck, Mic } from 'lucide-react';

const MOCK_CONVERSATIONS: Record<string, unknown>[] = [
  { id: 'c1', channel: 'VOICE', phone: 'Zafer Ayyıldız — 05321234567', type: 'call', status: 'COMPLETED', duration: 150, sessionLabel: 'SESSION-20260722-0001', createdAt: new Date(Date.now() - 3600000).toISOString(), lastMessage: '2 kg sucuk siparişi verildi', confidence: 95 },
  { id: 'c2', channel: 'WHATSAPP', phone: 'Mehmet Öztürk — 05339876543', type: 'whatsapp', status: 'COMPLETED', duration: null, sessionLabel: null, createdAt: new Date(Date.now() - 7200000).toISOString(), lastMessage: 'Tamam teslim adresim aynı', confidence: 92 },
  { id: 'c3', channel: 'INSTAGRAM', phone: '@ali_kaya — 05411223344', type: 'instagram', status: 'COMPLETED', duration: null, sessionLabel: 'IG-20260722-0001', createdAt: new Date(Date.now() - 14400000).toISOString(), lastMessage: 'Sucuk fiyatı ne kadar?', confidence: 88 },
  { id: 'c4', channel: 'VOICE', phone: 'Fatma Şahin — 05449876543', type: 'call', status: 'missed', duration: null, sessionLabel: null, createdAt: new Date(Date.now() - 28800000).toISOString(), lastMessage: '', confidence: 0 },
  { id: 'c5', channel: 'WHATSAPP', phone: 'Ali Kaya — 05411223344', type: 'whatsapp', status: 'AI_SPEAKING', duration: null, sessionLabel: null, createdAt: new Date(Date.now() - 43200000).toISOString(), lastMessage: '2 kilo sucuk istiyorum', confidence: 90 },
  { id: 'c6', channel: 'INSTAGRAM', phone: '@hatice_celik — 05328765432', type: 'instagram', status: 'COMPLETED', duration: null, sessionLabel: 'IG-20260721-0002', createdAt: new Date(Date.now() - 86400000).toISOString(), lastMessage: 'Lokum çeşitleriniz var mı?', confidence: 85 },
];

const IG_MESSAGES = [
  { id: 'ig1', direction: 'incoming', body: 'Merhaba, sucuk çeşitleriniz var mı?', createdAt: new Date(Date.now() - 300000).toISOString() },
  { id: 'ig2', direction: 'outgoing', body: 'Merhaba! Evet, Dana Parmak Sucuk (890 TL/KG) ve Kangal Sucuk (750 TL/KG) çeşitlerimiz mevcut. Hangisinden istersiniz?', createdAt: new Date(Date.now() - 280000).toISOString() },
  { id: 'ig3', direction: 'incoming', body: '2 kilo dana parmak sucuk alabilir miyim?', createdAt: new Date(Date.now() - 240000).toISOString() },
  { id: 'ig4', direction: 'outgoing', body: 'Tabii, 2 kg Dana Parmak Sucuk siparişinizi aldım. Adınızı ve teslimat adresinizi alabilir miyim?', createdAt: new Date(Date.now() - 200000).toISOString() },
  { id: 'ig5', direction: 'incoming', body: 'Ali Kaya, İstanbul Kadıköy', createdAt: new Date(Date.now() - 120000).toISOString() },
];

const WA_MESSAGES = [
  { id: 'w1', direction: 'incoming', body: 'Merhaba 2 kilo sucuk istiyorum', createdAt: new Date(Date.now() - 600000).toISOString() },
  { id: 'w2', direction: 'outgoing', body: 'Merhaba! 2 kg Dana Parmak Sucuk siparişinizi aldım. Adınızı ve adresinizi alabilir miyim?', createdAt: new Date(Date.now() - 580000).toISOString() },
  { id: 'w3', direction: 'incoming', body: 'Mehmet Öztürk, Afyon Merkez', createdAt: new Date(Date.now() - 540000).toISOString() },
];

const MOCK_TRANSCRIPT = [
  { user_message: 'Merhaba 2 kilo sucuk istiyorum', raw_response: '{"intent":"ORDER","reply":"Merhaba, siparişinizi alabilir miyim? Adınız nedir?"}', confidence: 95, created_at: new Date(Date.now() - 150000).toISOString() },
  { user_message: 'Ben Mehmet', raw_response: '{"intent":"ORDER","reply":"Teşekkürler Mehmet Bey. 2 kg Dana Parmak Sucuk siparişinizi onaylıyor musunuz?","customer":{"name":"Mehmet"}}', confidence: 92, created_at: new Date(Date.now() - 120000).toISOString() },
  { user_message: 'Evet onaylıyorum', raw_response: '{"intent":"CONFIRM","reply":"Harika! Siparişiniz alındı. Toplam 1.780 TL. Teslimat adresinizi alabilir miyim?"}', confidence: 97, created_at: new Date(Date.now() - 90000).toISOString() },
];

function formatDuration(seconds: number | null) { if (!seconds) return '-'; return `${Math.floor(seconds / 60)}dk ${seconds % 60}sn`; }

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Record<string, unknown>[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [filter, setFilter] = useState('all');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    setConversations(MOCK_CONVERSATIONS);
  }, []);

  const filtered = conversations.filter((c) => {
    if (filter === 'voice' && c.channel !== 'VOICE') return false;
    if (filter === 'whatsapp' && c.channel !== 'WHATSAPP') return false;
    if (filter === 'instagram' && c.channel !== 'INSTAGRAM') return false;
    if (filter === 'missed' && c.status !== 'missed' && c.status !== 'failed') return false;
    return true;
  });

  const getStatusBadge = (c: Record<string, unknown>) => {
    const status = c.status as string;
    if (status === 'active' || status === 'AI_SPEAKING') return { label: '🟢 Devam Ediyor', color: 'bg-green-100 text-green-700' };
    if (status === 'missed' || status === 'failed' || status === 'TIMEOUT') return { label: '🔴 Kaçırıldı', color: 'bg-red-100 text-red-700' };
    if (status === 'completed' || status === 'COMPLETED') return { label: '✅ Tamamlandı', color: 'bg-green-100 text-green-700' };
    return { label: status, color: 'bg-gray-100 text-gray-600' };
  };

  const selectConversation = (c: Record<string, unknown>) => {
    setSelected(c);
    setDetail({
      session: { id: c.id, channel: c.channel, phone: c.phone, status: c.status, call_duration: c.duration, session_label: c.sessionLabel, call_recording_url: null, created_at: c.createdAt },
      recording: c.channel === 'VOICE' ? { recording_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' } : null,
      transcript: c.channel === 'VOICE' ? MOCK_TRANSCRIPT : [],
      whatsappMessages: c.channel === 'WHATSAPP' ? WA_MESSAGES : c.channel === 'INSTAGRAM' ? IG_MESSAGES : [],
    });
  };

  const channelName = selected?.channel as string;
  const isVoice = channelName === 'VOICE';
  const isWhatsapp = channelName === 'WHATSAPP';
  const isInstagram = channelName === 'INSTAGRAM';
  const waMessages = (detail?.whatsappMessages as Record<string, unknown>[]) || [];
  const transcript = (detail?.transcript as Record<string, unknown>[]) || [];
  const recording = detail?.recording as Record<string, unknown> | null;
  const conf = (selected?.confidence as number) || 0;

  return (
    <div className="p-4 flex flex-col lg:flex-row gap-4 h-auto lg:h-[calc(100vh-2rem)]">
      {/* Left Panel */}
      <div className="w-full lg:w-2/5 flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Görüşmeler</h1>
          <span className="text-xs text-slate-400 dark:text-slate-500">{conversations.length} kayıt</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'Tümü', icon: <Layers className="w-4 h-4" />, activeClass: 'bg-slate-700 dark:bg-slate-600 text-white shadow-lg ring-2 ring-slate-400', inactiveClass: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700' },
            { key: 'voice', label: 'Telefon', icon: <PhoneCall className="w-4 h-4" />, activeClass: 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 ring-2 ring-blue-300', inactiveClass: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40' },
            { key: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" />, activeClass: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300', inactiveClass: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40' },
            { key: 'instagram', label: 'Instagram', icon: <Camera className="w-4 h-4" />, activeClass: 'bg-pink-600 text-white shadow-lg shadow-pink-500/40 ring-2 ring-pink-300', inactiveClass: 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 hover:bg-pink-100 dark:hover:bg-pink-900/40' },
            { key: 'missed', label: 'Kaçırılan', icon: <AlertTriangle className="w-4 h-4" />, activeClass: 'bg-red-600 text-white shadow-lg shadow-red-500/40 ring-2 ring-red-300', inactiveClass: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40' },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${filter === f.key ? f.activeClass : f.inactiveClass}`}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {filtered.map((c) => {
            const badge = getStatusBadge(c);
            const ch = c.channel as string;
            const icon = ch === 'INSTAGRAM' ? '📸' : ch === 'WHATSAPP' ? '💬' : c.status === 'failed' ? '🔴' : '📞';
            const iconBg = ch === 'INSTAGRAM' ? 'bg-pink-100' : ch === 'WHATSAPP' ? 'bg-emerald-100' : 'bg-blue-100';
            return (
              <div key={c.id as string} onClick={() => selectConversation(c)}
                className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group ${selected?.id === c.id ? 'ring-2 ring-indigo-400 border-indigo-300 shadow-md' : ''}`}>
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-full ${iconBg} dark:opacity-80 flex items-center justify-center text-sm shrink-0`}>{icon}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.phone as string}</p>
                      {Boolean(c.lastMessage) && <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{String(c.lastMessage)}</p>}
                    </div>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ml-1 ${badge.color}`}>{badge.label}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                  {c.type === 'call' && <span>⏱ {formatDuration(c.duration as number | null)}</span>}
                  <span>{new Date(c.createdAt as string).toLocaleString('tr-TR')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-3/5">
        {selected ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 overflow-y-auto h-full">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isVoice ? '📞 Telefon' : isWhatsapp ? '💬 WhatsApp' : '📸 Instagram'} Görüşmesi
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{selected.phone as string}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {conf > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                    🎯 %{conf} Anlama İsabeti
                  </span>
                )}
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selected).color}`}>
                  {getStatusBadge(selected).label}
                </span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">Tarih</span>
                <p className="font-medium text-slate-900 dark:text-white mt-0.5">{new Date(selected.createdAt as string).toLocaleString('tr-TR')}</p>
              </div>
              {Boolean(selected.duration) && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Süre</span>
                  <p className="font-medium text-slate-900 dark:text-white mt-0.5">{formatDuration(selected.duration as number | null)}</p>
                </div>
              )}
              {Boolean(selected.sessionLabel) && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Oturum</span>
                  <p className="font-medium text-slate-900 dark:text-white mt-0.5">{String(selected.sessionLabel)}</p>
                </div>
              )}
            </div>

            {/* Phone: Audio Player + Transcript */}
            {isVoice && (
              <>
                {recording?.recording_url && (
                  <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Mic className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Ses Kaydı</span>
                    </div>
                    <div className="flex items-center gap-0.5 h-8">
                      {[...Array(40)].map((_, i) => (
                        <div key={i} className="flex-1 bg-blue-500 dark:bg-blue-400 rounded-full"
                          style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.05}s`, opacity: 0.5 + Math.random() * 0.5 }} />
                      ))}
                    </div>
                    <audio controls className="w-full h-8" src={recording.recording_url as string}>
                      Tarayıcınız ses kaydını desteklemiyor.
                    </audio>
                  </div>
                )}

                {transcript.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block flex items-center gap-1.5">📝 Konuşma Dökümü</label>
                    <div className="bg-white dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-xl p-4 space-y-3 max-h-64 overflow-y-auto">
                      {transcript.map((entry, i) => (
                        <div key={i} className="space-y-2">
                          {Boolean(entry.user_message) && (
                            <div className="flex gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] shrink-0 mt-0.5">👤</div>
                              <div className="flex-1">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-slate-800 dark:text-slate-200">
                                  {(entry.user_message as string).substring(0, 200)}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5 ml-1">Müşteri · {new Date(entry.created_at as string).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </div>
                          )}
                          {Boolean(entry.raw_response) && (
                            <div className="flex gap-2.5 flex-row-reverse">
                              <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-[10px] shrink-0 mt-0.5">🤖</div>
                              <div className="flex-1 flex flex-col items-end">
                                <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl rounded-tr-sm px-3 py-2 text-sm text-slate-800 dark:text-slate-200 max-w-[90%]">
                                  {(() => { try { const j = JSON.parse(entry.raw_response as string); return String(j.reply || entry.raw_response).substring(0, 200); } catch { return (entry.raw_response as string).substring(0, 200); } })()}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 mr-1">
                                  <span>YZ Asistan</span>
                                  {Boolean((entry as any).confidence) && <span className="text-emerald-600 font-medium">%{(entry as any).confidence}</span>}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* WhatsApp: Chat Bubbles */}
            {isWhatsapp && waMessages.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block flex items-center gap-1.5">💬 WhatsApp Sohbeti</label>
                <div className="bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4 space-y-2 max-h-64 overflow-y-auto">
                  {waMessages.map((msg) => (
                    <div key={msg.id as string} className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${msg.direction === 'outgoing' ? 'bg-emerald-500 text-white rounded-br-sm' : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-emerald-200 dark:border-emerald-700 rounded-bl-sm'}`}>
                        <p className="leading-relaxed">{String(msg.body)}</p>
                        <p className={`text-[10px] mt-1 ${msg.direction === 'outgoing' ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}`}>
                          {new Date(msg.createdAt as string).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instagram: DM Bubbles */}
            {isInstagram && waMessages.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block flex items-center gap-1.5">📸 Instagram DM</label>
                <div className="bg-gradient-to-br from-pink-50/50 to-purple-50/50 dark:from-pink-900/10 dark:to-purple-900/10 border border-pink-200 dark:border-pink-800 rounded-xl p-4 space-y-2 max-h-64 overflow-y-auto">
                  {waMessages.map((msg) => (
                    <div key={msg.id as string} className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${msg.direction === 'outgoing' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-br-sm' : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-pink-200 dark:border-pink-700 rounded-bl-sm'}`}>
                        <p className="leading-relaxed">{String(msg.body)}</p>
                        <p className={`text-[10px] mt-1 ${msg.direction === 'outgoing' ? 'text-pink-100' : 'text-slate-400'}`}>
                          {new Date(msg.createdAt as string).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <a href={`tel:${selected.phone}`} target="_blank"
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                <PhoneCall className="w-4 h-4" /> Geri Ara
              </a>
              {(isWhatsapp || isInstagram) && (
                <a href={`https://wa.me/${selected.phone}`} target="_blank"
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors">
                  <MessageCircle className="w-4 h-4" /> Yanıtla
                </a>
              )}
              <a href="/customers" className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <User className="w-4 h-4" /> Müşteri Kartına Git
              </a>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-xs">
              <div className="w-16 h-16 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-3">
                <PhoneIncoming className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Detaylarını, ses kaydını veya sohbet dökümünü incelemek için soldan bir görüşme seçin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
