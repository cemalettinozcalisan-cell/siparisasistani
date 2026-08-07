'use client';

import { getTenantId } from '@/lib/tenant';
import { useState } from 'react';
import { Brain, Copy, Loader2, ChevronDown, Phone, MessageCircle, Camera, MessageSquare, RefreshCw } from 'lucide-react';

const STATE_TR: Record<string, string> = {
  GREETING: 'Karşılama', ISIM: 'İsim Alma', ORDERING: 'Sipariş Alma',
  SUMMARIZING: 'Özet & Onay', ASKING_ADDRESS: 'Adres Alma', ASKING_PHONE: 'Telefon Alma',
  ASKING_PAYMENT: 'Ödeme Alma', CAMPAIGN: 'Kampanya', FINAL_CONFIRMATION: 'Son Onay',
  ORDER_CREATED: 'Sipariş Oluşturuldu', GOODBYE: 'Veda',
};

const CHANNELS: { key: string; label: string; icon: typeof Phone }[] = [
  { key: 'phone', label: 'Telefon', icon: Phone },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'instagram', label: 'Instagram', icon: Camera },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
];

export default function PromptsPage() {
  const [tenantId] = useState(getTenantId());
  const [channel, setChannel] = useState('phone');
  const [state, setState] = useState('GREETING');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const loadPrompt = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/ai-test/prompt-preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, channel, state }),
      });
      if (!res.ok) { setError('API yanıt vermedi.'); setPrompt(''); return; }
      const data = await res.json();
      setPrompt(data.prompt || '');
    } catch { setError('Backend bağlantı hatası.'); setPrompt(''); }
    setLoading(false);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 w-full max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Brain size={22} className="text-violet-500" /> Prompt Denetleyici
        </h1>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
          AI&apos;ya gönderilen sistem promptunu kanal ve duruma göre canlı olarak görüntüleyin
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Kanal</label>
            <div className="flex gap-1">
              {CHANNELS.map((ch) => {
                const active = channel === ch.key;
                const Icon = ch.icon;
                return (
                  <button key={ch.key} onClick={() => setChannel(ch.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      active ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-gray-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}>
                    <Icon size={13} /> {ch.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Durum</label>
            <select value={state} onChange={(e) => setState(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none min-w-[180px]">
              {Object.entries(STATE_TR).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <button onClick={loadPrompt} disabled={loading}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-all flex items-center gap-1.5">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {loading ? 'Yükleniyor...' : 'Promptu Yükle'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600">{error}</div>
      )}

      {prompt && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
              <Brain size={13} className="text-violet-500" />
              {CHANNELS.find(c => c.key === channel)?.label} · {STATE_TR[state] || state}
            </span>
            <button onClick={copyPrompt}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                copied ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-600' :
                'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-gray-500 hover:bg-slate-50 dark:hover:bg-slate-600'
              }`}>
              <Copy size={12} /> {copied ? 'Kopyalandı' : 'Kopyala'}
            </button>
          </div>
          <pre className="p-4 bg-slate-950 text-green-400 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-auto">
            {prompt}
          </pre>
        </div>
      )}
    </div>
  );
}
