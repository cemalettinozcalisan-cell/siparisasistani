'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { LifeBuoy, Send, Sparkles, Bot, MessageSquare, Plus } from 'lucide-react';
import { getTenantId } from '@/lib/tenant';

interface ChatSession {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  body: string;
  created_at: string;
}

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Yükleniyor...</div>}>
      <SupportContent />
    </Suspense>
  );
}

function SupportContent() {
  const tid = getTenantId();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadSessions = () => {
    fetch(`/api/support/${tid}/chat/sessions`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSessions(d); })
      .catch(() => {});
  };

  const loadMessages = (sessionId: string) => {
    fetch(`/api/support/${tid}/chat/sessions/${sessionId}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setMessages(d); })
      .catch(() => setMessages([]));
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, activeSession]);

  const openSession = (id: string) => {
    setActiveSession(id);
    loadMessages(id);
  };

  const newChat = () => {
    setActiveSession(null);
    setMessages([]);
    setInput('');
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    // Optimistik: kullanıcı mesajını ekle
    setMessages(prev => [...prev, { id: 'temp', sender: 'user', body: text, created_at: new Date().toISOString() }]);
    try {
      const res = await fetch(`/api/support/${tid}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession, message: text }),
      });
      const data = await res.json();
      if (data.sessionId) {
        setActiveSession(data.sessionId);
        loadMessages(data.sessionId);
        loadSessions();
      }
    } catch {
      setMessages(prev => [...prev, { id: 'err', sender: 'ai', body: 'Bir hata oluştu. Lütfen tekrar deneyin.', created_at: new Date().toISOString() }]);
    }
    setSending(false);
  };

  return (
    <div className="p-4 md:p-6 w-full h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm shadow-emerald-500/20">
            <LifeBuoy size={16} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Destek Asistanı</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sistemi öğrenin, sorunlarınızı çözün — AI yanıtlar</p>
          </div>
        </div>
        <button onClick={newChat}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-xs font-semibold shadow-md transition-all">
          <Plus size={14} /> Yeni Sohbet
        </button>
      </div>

      {/* Chat Layout: sol geçmiş + sağ sohbet */}
      <div className="flex-1 min-h-0 flex gap-4">
        {/* Left: Geçmiş (tarih + başlık sıralı) */}
        <div className="w-64 shrink-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col min-h-0">
          <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-700 text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <MessageSquare size={12} /> Sohbet Geçmişi
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map((s) => (
              <button key={s.id} onClick={() => openSession(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${activeSession === s.id ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30 border border-transparent'}`}>
                <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{s.title || 'Destek Sohbeti'}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(s.updated_at).toLocaleString('tr-TR')}</p>
              </button>
            ))}
            {sessions.length === 0 && (
              <div className="text-center text-[11px] text-slate-400 py-6">Henüz sohbet yok</div>
            )}
          </div>
        </div>

        {/* Right: Sohbet */}
        <div className="flex-1 min-w-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col min-h-0">
          {/* Başlık */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles size={13} className="text-emerald-500" /> SiparişAsistanı Destek Asistanı
            </span>
          </div>

          {/* Mesajlar */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Bot size={24} className="text-white" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Merhaba! Size nasıl yardımcı olayım?</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Sistemi kullanmayı öğrenebilir veya bir sorununuzu yazabilirsiniz. Örn: "Sipariş ekleyemiyorum", "Müşteri özel fiyat nasıl verilir"
                  </p>
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={m.id + i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs whitespace-pre-wrap ${
                  m.sender === 'user'
                    ? 'bg-emerald-500 text-white rounded-br-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-sm'
                }`}>
                  {m.body}
                  <span className={`block text-[9px] mt-1 ${m.sender === 'user' ? 'text-white/70' : 'text-slate-400'}`}>
                    {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Giriş */}
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
              placeholder="Sorunuzu yazın... (örn. müşteriye özel fiyat nasıl verilir?)"
              className="flex-1 px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            <button onClick={sendMessage} disabled={sending || !input.trim()}
              className="p-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg shadow-sm transition-all">
              {sending ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
