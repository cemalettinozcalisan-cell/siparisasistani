'use client';

import { useState, useEffect } from 'react';
import { Brain, Copy, Loader2, Phone, MessageCircle, Camera, MessageSquare, RefreshCw, Save, FlaskConical, Undo2, ChevronDown } from 'lucide-react';
import { getTenantId } from '@/lib/tenant';
import { useRouter } from 'next/navigation';

const STATE_TR: Record<string, string> = {
  GREETING: 'Karşılama', ISIM: 'İsim Alma', ORDERING: 'Sipariş Alma',
  SUMMARIZING: 'Özet & Onay', ASKING_ADDRESS: 'Adres Alma', ASKING_PHONE: 'Telefon Alma',
  ASKING_PAYMENT: 'Ödeme Alma', CAMPAIGN: 'Kampanya', FINAL_CONFIRMATION: 'Son Onay',
  ORDER_CREATED: 'Sipariş Oluşturuldu', GOODBYE: 'Veda',
};

const CHANNELS: { key: string; label: string; icon: typeof Phone; gradient: string }[] = [
  { key: 'phone', label: 'Telefon', icon: Phone, gradient: 'from-blue-500 to-blue-600' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, gradient: 'from-emerald-400 to-emerald-600' },
  { key: 'instagram', label: 'Instagram', icon: Camera, gradient: 'from-pink-500 to-purple-600' },
  { key: 'sms', label: 'SMS', icon: MessageSquare, gradient: 'from-sky-400 to-blue-500' },
];

const CHEAT_SHEET = [
  { var: '{{company_name}}', desc: 'Firma Adı' },
  { var: '{{products_list}}', desc: 'Ürün Kataloğu' },
  { var: '{{customer_name}}', desc: 'Müşteri Adı Soyadı' },
  { var: '{{customer_phone}}', desc: 'Müşteri Telefon' },
  { var: '{{customer_birthday}}', desc: 'Müşteri Doğum Günü' },
  { var: '{{payment_methods}}', desc: 'Ödeme Yöntemleri' },
  { var: '{{active_campaigns}}', desc: 'Aktif Kampanyalar' },
  { var: '{{business_hours}}', desc: 'Çalışma Saatleri' },
  { var: '{{cargo_settings}}', desc: 'Kargo Ayarları' },
];

export default function PromptsPage() {
  const router = useRouter();
  const [tenantId] = useState(getTenantId());
  const [channel, setChannel] = useState('phone');
  const [state, setState] = useState('GREETING');
  const [prompt, setPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load custom prompts map on mount
  useEffect(() => {
    fetch(`/api/ai-test/prompt-custom/${tenantId}`)
      .then(r => r.json())
      .then(custom => {
        const key = `${channel}_${state}`;
        if (custom?.[key]) {
          setPrompt(custom[key]);
          setOriginalPrompt(custom[key]);
        }
      }).catch(() => {});
  }, []);

  const loadPrompt = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-test/prompt-preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, channel, state }),
      });
      const data = await res.json();
      const systemPrompt = data.prompt || '';
      setPrompt(systemPrompt);
      setOriginalPrompt(systemPrompt);
    } catch { setPrompt(''); setOriginalPrompt(''); }
    setLoading(false);
  };

  const savePrompt = async () => {
    setSaving(true);
    await fetch('/api/ai-test/prompt-save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, channel, state, prompt }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const resetPrompt = async () => {
    await fetch('/api/ai-test/prompt-reset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, channel, state }),
    });
    setPrompt(originalPrompt);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const copyVar = (v: string) => {
    navigator.clipboard.writeText(v);
  };

  const handleStateChannelChange = (ch?: string, st?: string) => {
    if (ch) setChannel(ch);
    if (st) setState(st);
    setPrompt('');
    setOriginalPrompt('');
  };

  const testPrompt = () => {
    router.push('/ai-test');
  };

  return (
    <div className="p-4 md:p-6 space-y-5 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Brain size={22} className="text-violet-500" /> Prompt Denetleyici
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            AI asistanına gönderilen sistem promptunu görüntüleyin, düzenleyin ve test edin
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Kanal</label>
            <div className="flex gap-1">
              {CHANNELS.map((ch) => {
                const active = channel === ch.key;
                const Icon = ch.icon;
                return (
                  <button key={ch.key} onClick={() => handleStateChannelChange(ch.key, undefined)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                      active ? `text-white shadow-sm bg-gradient-to-r ${ch.gradient} border-transparent` : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}>
                    <Icon size={13} /> {ch.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Durum</label>
            <select value={state} onChange={(e) => handleStateChannelChange(undefined, e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none min-w-[180px]">
              {Object.entries(STATE_TR).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <button onClick={loadPrompt} disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {loading ? 'Yükleniyor...' : 'Promptu Yükle'}
          </button>
        </div>
      </div>

      {/* 2-Column Grid: Editor | Cheat Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Editor (3/4) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Brain size={13} className="text-violet-500" />
              {CHANNELS.find(c => c.key === channel)?.label} · {STATE_TR[state] || state}
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={copyPrompt} disabled={!prompt}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                  copied ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}>
                <Copy size={12} /> {copied ? 'Kopyalandı' : 'Kopyala'}
              </button>
              <button onClick={resetPrompt} disabled={!prompt || prompt === originalPrompt}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-30">
                <Undo2 size={12} /> Sıfırla
              </button>
            </div>
          </div>
          {prompt ? (
            <>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-[450px] p-4 bg-slate-950 text-green-400 text-xs font-mono leading-relaxed resize-none outline-none border-0"
                spellCheck={false} />
              <div className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-100 dark:border-slate-700">
                <button onClick={savePrompt} disabled={saving || prompt === originalPrompt}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                    saved ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white'
                  } disabled:opacity-30`}>
                  <Save size={13} /> {saved ? 'Kaydedildi!' : 'Promptu Kaydet'}
                </button>
                <button onClick={testPrompt}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border-2 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all">
                  <FlaskConical size={13} /> AI Sohbet'te Test Et
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[450px] text-slate-400 text-xs">
              <div className="text-center">
                <Brain size={32} className="mx-auto mb-2 opacity-30" />
                <p>Kanal ve durum seçip "Promptu Yükle" butonuna basın</p>
              </div>
            </div>
          )}
        </div>

        {/* Cheat Sheet (1/4) */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-1.5">
            <FlaskConical size={14} className="text-indigo-500" /> Dinamik Değişkenler
          </h3>
          <p className="text-[10px] text-slate-400 mb-3">Prompt içinde kullanabileceğiniz değişkenler. Tıklayınca panoya kopyalanır.</p>
          <div className="space-y-1.5">
            {CHEAT_SHEET.map((item) => (
              <button key={item.var} onClick={() => copyVar(item.var)}
                className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group">
                <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 flex-shrink-0">{item.var}</span>
                <span className="text-[10px] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">{item.desc}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
            <p className="text-[9px] text-slate-400 leading-relaxed">
              Bu değişkenler AI'a gönderilmeden önce sistem tarafından otomatik olarak gerçek değerlerle değiştirilir. Prompt'u düzenlerken referans olarak kullanabilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
