'use client';

import { useState } from 'react';

export default function AiSimulatorPage() {
  const [conversation, setConversation] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: 'Merhaba, Ahmet İpek Sucukları\'na hoş geldiniz. Siparişinizi alabilir miyim?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    const updated = [...conversation, userMsg];
    setConversation(updated);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai-test/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 'demo-tenant-id',
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const parsed = data.parsed as Record<string, string>;
      setConversation([...updated, { role: 'assistant', content: parsed.reply || data.response }]);
    } catch {
      setConversation([...updated, { role: 'assistant', content: 'Bağlantı hatası oluştu.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">AI Simülatı¶rü</h1>
      <p className="text-sm text-gray-500">Telefon olmadan AI ile konuşmayı simüle et</p>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 h-96 overflow-y-auto">
        {conversation.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-lg px-4 py-2 rounded-xl text-sm ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-center text-sm text-gray-400">AI yanıt yazıyor...</div>}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Mesajınızı yazın..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <button onClick={sendMessage} disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          Gı¶nder
        </button>
      </div>
    </div>
  );
}
