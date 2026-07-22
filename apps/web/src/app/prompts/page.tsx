'use client';

import { useState } from 'react';

export default function PromptsPage() {
  const [tenantId, setTenantId] = useState('00000000-0000-0000-0000-000000000001');
  const [channel, setChannel] = useState('phone');
  const [state, setState] = useState('welcome');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPrompt = async () => {
    setLoading(true);
    const res = await fetch('/api/ai-test/prompt-preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, channel, state }),
    });
    const data = await res.json();
    setPrompt(data.prompt || 'Hata: Prompt yuklenemedi');
    setLoading(false);
  };

  const copyPrompt = () => navigator.clipboard.writeText(prompt);
  const states = ['welcome', 'ordering', 'customer_confirmation', 'address', 'payment', 'order_created'];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Prompt Playground</h1>
      <p className="text-sm text-gray-500">AIya tam olarak ne gonderdigimizi gor ve duzenle</p>

      <div className="flex gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500">Kanal</label>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className="block px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1">
            <option value="phone">Telefon</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Durum</label>
          <select value={state} onChange={(e) => setState(e.target.value)} className="block px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1">
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={loadPrompt} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Yukleniyor...' : 'Promptu Goster'}
        </button>
      </div>

      {prompt && (
        <div className="relative">
          <pre className="w-full h-96 overflow-auto px-4 py-3 bg-gray-900 text-green-400 rounded-xl text-xs font-mono whitespace-pre-wrap">{prompt}</pre>
          <button onClick={copyPrompt} className="absolute top-2 right-2 px-3 py-1 bg-white/10 text-white rounded text-xs hover:bg-white/20">Kopyala</button>
        </div>
      )}
    </div>
  );
}
