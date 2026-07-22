'use client';

import { useState } from 'react';

export default function AiTestPage() {
  const [messages, setMessages] = useState('Musteri: 3 kilo sucuk istiyorum');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const simulate = async () => {
    setLoading(true);
    const res = await fetch('/api/ai-test/simulate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: '00000000-0000-0000-0000-000000000001',
        messages: messages.split('\n').filter(Boolean).map((line) => {
          const [role, ...content] = line.split(':');
          return { role: role.trim().toLowerCase(), content: content.join(':').trim() };
        }),
      }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">AI Test Konsolu</h1>
      <p className="text-sm text-gray-500">Konusmayi yapistir, AI'nin nasil yanit verdigini gor</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Konusma (satir: rol: mesaj)</label>
          <textarea value={messages} onChange={(e) => setMessages(e.target.value)} rows={10} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
          <button onClick={simulate} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{loading ? 'Calisiyor...' : 'Test Et'}</button>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">AI Yaniti</label>
          <pre className="w-full h-64 overflow-auto px-3 py-2 bg-gray-900 text-green-400 rounded-lg text-xs font-mono">{result ? JSON.stringify(result.parsed, null, 2) : 'Sonuc burada gorunecek...'}</pre>
        </div>
      </div>
    </div>
  );
}
