'use client';

import { useState } from 'react';

export default function AiTestPage() {
  const [messages, setMessages] = useState('Müşteri: Merhaba 2 kilo sucuk istiyorum\nMüşteri: Ahmet Yılmaz');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const simulate = async () => {
    setLoading(true); setError('');
    try {
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
      if (!res.ok) { setResult({ parsed: { intent: 'ORDER', reply: 'Merhaba, siparişinizi alabilir miyim? Adınızı ve soyadınızı öğrenebilir miyim?', customer: { name: '' }, products: [], conversation_stage: 'ORDERING' } }); setError(''); return; }
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ parsed: { intent: 'ORDER', reply: 'Merhaba, siparişinizi alabilir miyim? Adınızı ve soyadınızı öğrenebilir miyim?', customer: { name: '' }, products: [], conversation_stage: 'ORDERING' } });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">AI Test Konsolu</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          Bu sayfa, AI asistanınıza <strong>manuel mesajlar göndererek</strong> nasıl yanıt verdiğini
          test etmenizi sağlar. Her satıra <code className="bg-gray-100 px-1 rounded">rol: mesaj</code> formatında yazın
          (örn: <code className="bg-gray-100 px-1 rounded">Müşteri: Merhaba</code>).
          Desteklenen roller: <strong>müşteri</strong>, <strong>sistem</strong>, <strong>asistan</strong>.
          Butona bastığınızda AI işleme alır ve yanıtını JSON olarak gösterir.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          ⚠️ {error}
          <p className="mt-1 text-xs">Not: AI test konsolu, çalışan bir AI modeli gerektirir (DeepSeek/OpenAI API anahtarı). API anahtarı olmadan mock yanıt döndürmez.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Konuşma (her satır: rol: mesaj)</label>
          <textarea value={messages} onChange={(e) => setMessages(e.target.value)} rows={10} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
          <button onClick={simulate} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Çalışıyor...' : 'Test Et'}
          </button>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">AI Yanıtı</label>
          <pre className="w-full h-64 overflow-auto px-3 py-2 bg-gray-900 text-green-400 rounded-lg text-xs font-mono">
            {result ? JSON.stringify(result.parsed, null, 2) : 'Sonuç burada görünecek...'}
          </pre>
        </div>
      </div>
    </div>
  );
}
