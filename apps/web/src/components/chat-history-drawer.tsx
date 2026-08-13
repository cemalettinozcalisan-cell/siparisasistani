'use client';

import { getTenantId } from '@/lib/tenant';

import { useEffect, useState } from 'react';
import { X, MessageSquare, PhoneCall, Bot, ExternalLink } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'customer' | 'ai' | 'system';
  content: string;
  timestamp: string;
  source?: string;
  confidence?: number;
}

export function ChatHistoryDrawer({
  orderId,
  orderNumber,
  customerPhone,
  onClose,
}: {
  orderId: string;
  orderNumber?: string;
  customerPhone: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const tid = getTenantId();
        // Load AI audit logs for this order
        const res = await fetch(`/api/replay/conversation/${orderId}`);
        const data = await res.json();
        const audits = (data.audits || []) as Record<string, unknown>[];
        const transcript = (data.transcript || []) as Record<string, unknown>[];

        const chat: ChatMessage[] = [];

        // Add transcript messages
        for (const t of transcript) {
          const role = t.role as string;
          if (role === 'customer' || role === 'user') {
            chat.push({ id: `t-${chat.length}`, role: 'customer', content: String(t.content || ''), timestamp: String(t.created_at || new Date().toISOString()) });
          } else if (role === 'assistant' || role === 'ai') {
            chat.push({ id: `t-${chat.length}`, role: 'ai', content: String(t.content || ''), timestamp: String(t.created_at || new Date().toISOString()) });
          }
        }

        // Add audit log messages
        for (const a of audits) {
          const userMsg = a.user_message as string;
          const rawResp = a.raw_response as string;
          const createdAt = a.created_at as string;
          if (userMsg) {
            chat.push({ id: `a-${chat.length}`, role: 'customer', content: userMsg, timestamp: createdAt, confidence: a.confidence as number });
          }
          if (rawResp) {
            let reply = rawResp;
            try { const j = JSON.parse(rawResp); reply = String(j.reply || rawResp); } catch {}
            chat.push({ id: `a-${chat.length}`, role: 'ai', content: reply, timestamp: createdAt, confidence: a.confidence as number });
          }
        }

        // Sort by timestamp
        chat.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setMessages(chat);
      } catch {}
      setLoading(false);
    };
    load();
  }, [orderId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-violet-500" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Konuşma Geçmişi</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subheader with order info */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <PhoneCall className="w-3.5 h-3.5" />
          {customerPhone}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Yükleniyor...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Henüz konuşma kaydı bulunmuyor</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'customer' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                  msg.role === 'customer'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-sm'
                    : 'bg-violet-500 text-white rounded-br-sm'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-semibold opacity-70">
                      {msg.role === 'customer' ? '👤 Müşteri' : '🤖 AI'}
                    </span>
                    {msg.confidence && (
                      <span className="text-[10px] opacity-70">%{msg.confidence}</span>
                    )}
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-[10px] mt-1 opacity-50">
                    {new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
          {orderNumber && (
            <button
              onClick={() => {
                onClose();
                window.open(`/calls?search=${encodeURIComponent(orderNumber)}`, '_blank');
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md"
            >
              <ExternalLink size={14} />
              Görüşme Ayrıntıları
            </button>
          )}
          <p className="text-[11px] text-slate-400 text-center">
            Kayıtlar 6 ay süreyle saklanır, süresi dolan kayıtlar otomatik silinir.
          </p>
        </div>
      </div>
    </div>
  );
}
