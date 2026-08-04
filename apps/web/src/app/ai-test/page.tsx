'use client';

import { useState } from 'react';
import { Bot, Send, Cpu, ChevronDown, ChevronUp } from 'lucide-react';

export default function AiTestPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: 'Merhaba, siparişinizi alabilir miyim?' },
  ]);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai-test/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: '00000000-0000-0000-0000-000000000001',
          messages: updated.map((m) => ({ role: m.role === 'user' ? 'customer' : 'assistant', content: m.content })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        const parsed = data.parsed as Record<string, unknown> || {};
        const reply = String(parsed.reply || data.response || 'Yanıt alınamadı.');
        setMessages([...updated, { role: 'assistant', content: reply }]);
      } else {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        setMessages([...updated, { role: 'assistant', content: `AI şu anda yanıt veremiyor. Sistem Durumu sayfasından API anahtarlarınızı kontrol edin. (${(err as any).message || res.status})` }]);
      }
    } catch {
      setMessages([...updated, { role: 'assistant', content: 'Sunucuya bağlanılamadı. Backend çalıştığından emin olun.' }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Sohbet</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Yapay zekâ asistanını test et</p>
        </div>
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-violet-500" />
          <span className="text-xs text-slate-400">AI Simülasyon</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chat Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">AI Asistan</span>
            </div>
            <span className="text-xs text-slate-400">Sohbet</span>
          </div>

          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-sm'
                }`}>
                  <p className="leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Mesajınızı yazın..."
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              <button onClick={sendMessage} disabled={loading}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* JSON Response Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <button onClick={() => setShowJson(!showJson)}
            className="w-full px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-white">
            <span>AI Yanıt Detayı</span>
            {showJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <div className={`overflow-auto transition-all duration-200 ${showJson ? 'h-80' : 'h-12'}`}>
            <pre className="p-4 text-xs font-mono text-green-400 dark:text-green-300 bg-slate-900 dark:bg-slate-950 whitespace-pre-wrap break-all">
              {result ? JSON.stringify(result, null, 2) : 'Henüz yanıt yok. Sohbet panelinden mesaj gönderin.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
