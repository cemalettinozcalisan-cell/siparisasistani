'use client';

import { useState } from 'react';

const STATE_TR: Record<string, string> = {
  welcome: 'Karşılama', ordering: 'Sipariş Alma',
  customer_confirmation: 'Müşteri Onayı', address: 'Adres Alma',
  payment: 'Ödeme', order_created: 'Sipariş Oluşturuldu',
};

export default function PromptsPage() {
  const [tenantId, setTenantId] = useState('00000000-0000-0000-0000-000000000001');
  const [channel, setChannel] = useState('phone');
  const [state, setState] = useState('welcome');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadPrompt = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/ai-test/prompt-preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, channel, state }),
      });
      if (!res.ok) { setError('API yanıt vermedi. Backend çalışıyor mu?'); setPrompt(''); return; }
      const data = await res.json();
      setPrompt(data.prompt || 'Hata: Prompt yüklenemedi');
    } catch { setError('Backend bağlantı hatası. Lütfen API\'nin çalıştığından emin olun.'); setPrompt(''); }
    setLoading(false);
  };

  const copyPrompt = () => navigator.clipboard.writeText(prompt);
  const states = Object.keys(STATE_TR);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prompt Deneme Alanı</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">AI'ya tam olarak ne gönderdiğimizi gör ve düzenle</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-2">
        <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
          Bu sayfa, AI asistanınıza hangi <strong>sistem promptlarının</strong> gönderildiğini gösterir.
          Kanal ve durum seçerek, AI'nın o andaki bağlamda tam olarak ne gördüğünü inceleyebilirsiniz.
          Promptlar, müşteri bilgileri, sipariş geçmişi ve işletme ayarlarınızı içerir.
        </p>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
          ⚠️ Şu an gösterilen prompt sabit bir örnektir. Kanal ve durum değiştikçe prompt'un dinamik olarak
          değişmesi için backend API'nin tam entegre olması gerekir (gerçek müşteri verisi, sipariş geçmişi vb.).
          Canlı sistemde buraya tıkladığınızda o anki bağlama göre güncel promptu göreceksiniz.
        </p>
      </div>

      <div className="flex gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400">Kanal</label>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className="block px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1">
            <option value="phone">Telefon</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400">Durum</label>
          <select value={state} onChange={(e) => setState(e.target.value)} className="block px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1">
            {states.map((s) => <option key={s} value={s}>{STATE_TR[s]}</option>)}
          </select>
        </div>
        <button onClick={loadPrompt} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Yükleniyor...' : 'Promptu Göster'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {prompt && (
        <div className="relative">
          <pre className="w-full h-96 overflow-auto px-4 py-3 bg-gray-900 text-green-400 rounded-xl text-xs font-mono whitespace-pre-wrap">{prompt}</pre>
          <button onClick={copyPrompt} className="absolute top-2 right-2 px-3 py-1 bg-white dark:bg-slate-800/10 text-white rounded text-xs hover:bg-white dark:bg-slate-800/20">Kopyala</button>
        </div>
      )}
    </div>
  );
}
