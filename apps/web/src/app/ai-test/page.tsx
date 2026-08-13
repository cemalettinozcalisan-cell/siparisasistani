'use client';

import { getTenantId } from '@/lib/tenant';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Cpu, ChevronDown, ChevronUp, Trash2, Copy, Activity, Zap, Clock, FileJson, MessageSquare, Phone, Camera } from 'lucide-react';

interface ParsedData { intent?: string; reply?: string; customer?: { name: string; phone?: string; }; products?: Array<{ product_name: string; quantity: number; unit: string; }>; address?: string; payment?: string; confidence?: number; }

interface DebugResult {
  parsed: ParsedData;
  latency: number;
  model: string;
  promptPreview: string;
  detectedState: string;
  intent: string;
  channel: string;
  hasMemory: boolean;
  response: string;
}

const CHANNEL_OPTIONS = [
  { value: 'phone', label: 'Telefon', icon: Phone, gradient: 'from-blue-500 to-blue-600' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, gradient: 'from-emerald-400 to-emerald-600' },
  { value: 'instagram', label: 'Instagram', icon: Camera, gradient: 'from-pink-500 via-purple-500 to-purple-600' },
  { value: 'sms', label: 'SMS', icon: MessageSquare, gradient: 'from-sky-400 to-blue-500' },
];

const STATE_LABELS: Record<string, string> = {
  welcome: 'Karşılama', ordering: 'Sipariş Alma', customer_confirmation: 'Onay Bekleniyor',
  address: 'Adres Toplama', asking_phone: 'Telefon Toplama', payment: 'Ödeme Alma',
};

const STATE_COLORS: Record<string, string> = {
  welcome: 'bg-slate-100 text-slate-600', ordering: 'bg-blue-100 text-blue-600',
  customer_confirmation: 'bg-emerald-100 text-emerald-600', address: 'bg-violet-100 text-violet-600',
  asking_phone: 'bg-amber-100 text-amber-600', payment: 'bg-orange-100 text-orange-600',
};

function formatMs(ms: number) { return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`; }

const MOCK_JSON = '{ "intent": "order", "reply": "Tabii efendim, 2 kg Dana Parmak Sucuk not ettim.", "customer": { "name": "Ahmet Yilmaz", "phone": "05321234567" }, "products": [{ "product_name": "Dana Parmak Sucuk", "quantity": 2, "unit": "KG" }], "address": "Ankara, Cankaya", "payment": "iban", "confidence": 94, "conversation_stage": "ordering", "emotion": "positive", "language": "tr" }';

export default function AiTestPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: 'Merhaba, siparişinizi alabilir miyim?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [lastResult, setLastResult] = useState<DebugResult | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Test parameters
  const [channel, setChannel] = useState('phone');
  const [customerPhone, setCustomerPhone] = useState('');
  const tid = getTenantId();

  // State timeline
  const [stateTimeline, setStateTimeline] = useState<string[]>([]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        tenantId: tid,
        messages: updated.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
        channel,
      };
      if (customerPhone.trim()) body.customerPhone = customerPhone.trim();

      const res = await fetch('/api/ai-test/simulate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });

      if (res.ok) {
        const data: DebugResult = await res.json();
        setResult(data);
        setLastResult(data);
        const reply = data.parsed?.reply || data.response || 'Yanıt alınamadı.';
        setMessages([...updated, { role: 'assistant', content: reply }]);
        setStateTimeline((prev) => {
          const state = data.detectedState || 'ordering';
          if (prev[prev.length - 1] !== state) return [...prev, state];
          return prev;
        });
      } else {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        setMessages([...updated, { role: 'assistant', content: `AI yanit veremedi. Sistem Durumu sayfasindan kontrol edin. (${(err as any).message || res.status})` }]);
      }
    } catch {
      setMessages([...updated, { role: 'assistant', content: 'Sunucuya baglanilamadi. Backend calistigindan emin olun.' }]);
    }
    setLoading(false);
  };

  const reset = () => {
    setMessages([{ role: 'assistant', content: 'Merhaba, siparişinizi alabilir miyim?' }]);
    setResult(null); setLastResult(null); setStateTimeline([]);
  };

  const copyPrompt = () => {
    if (result?.promptPreview) { navigator.clipboard.writeText(result.promptPreview); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const debug = lastResult;
  const chCfg = CHANNEL_OPTIONS.find(c => c.value === channel) || CHANNEL_OPTIONS[0];
  const ChIcon = chCfg.icon;

  return (
    <div className="p-4 space-y-3 h-[calc(100vh-2rem)] flex flex-col">
      {/* Top Control Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
            <Bot size={16} strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">AI Test Lab</span>
        </div>
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-slate-400">Kanal:</label>
          <select value={channel} onChange={(e) => setChannel(e.target.value)}
            className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none">
            {CHANNEL_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-white bg-gradient-to-r ${chCfg.gradient} shadow-sm`}>
            <ChIcon size={9} /> {chCfg.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-gray-400">Müşteri Tel:</label>
          <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Boş = yeni müşteri"
            className="px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white w-36" />
        </div>
        <button onClick={reset}
          className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-sm transition-all">
          <Trash2 size={12} /> Testi Temizle
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Left: Chat */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col min-h-0">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Bot size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">AI Asistan</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-white bg-gradient-to-r ${chCfg.gradient} shadow-sm ml-2`}>
              <ChIcon size={9} /> {chCfg.label}
            </span>
            {stateTimeline.length > 0 && (
              <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${STATE_COLORS[stateTimeline[stateTimeline.length - 1]] || 'bg-slate-100 text-slate-500'}`}>
                {STATE_LABELS[stateTimeline[stateTimeline.length - 1]] || stateTimeline[stateTimeline.length - 1]}
              </span>
            )}
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role !== 'user' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm">
                    <Bot size={12} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-sm shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-sm'
                }`}>
                  <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm">
                  <Bot size={12} className="text-white" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
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
                className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Debugger Panel - IDE Dark Theme */}
        <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-sm flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-700 flex items-center gap-3 flex-shrink-0 flex-wrap">
            <Activity size={14} className="text-indigo-400" />
            <span className="text-sm font-semibold text-slate-200">Debugger</span>
            {debug && (
              <>
                <span className="text-[10px] text-slate-600">|</span>
                <span className="text-[10px] text-slate-400 font-mono">{debug.model}</span>
                <span className="text-[10px] text-slate-600">|</span>
                <span className="text-[10px] text-slate-400 font-mono">{formatMs(debug.latency)}</span>
                <span className="text-[10px] text-slate-600">|</span>
                <span className="text-[10px] text-slate-400 font-mono">~{Math.round((debug.promptPreview?.length || 0) / 3.5)} tokens</span>
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {!debug ? (
              <div className="space-y-3">
                <p className="text-[10px] text-slate-500 font-mono">{'//'} Soldaki panelden mesaj gonderince debug bilgileri burada gorunecek</p>
                <p className="text-[10px] text-slate-500 font-mono">{'//'} Ornek cikti:</p>
                <pre className="bg-slate-800 text-green-400 rounded-lg p-3 text-[10px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(JSON.parse(MOCK_JSON), null, 2)}
                </pre>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">State Gecisleri</label>
                  <div className="flex items-center gap-1 flex-wrap">
                    {stateTimeline.map((s, i) => (
                      <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        i === stateTimeline.length - 1 ? 'ring-1 ring-offset-1 ring-offset-slate-900 ring-indigo-500 text-white bg-indigo-500/30' : 'text-slate-500 bg-slate-800 opacity-60'
                      }`}>
                        {STATE_LABELS[s] || s}
                      </span>
                    ))}
                    {stateTimeline.length === 0 && <span className="text-[10px] text-slate-600">—</span>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-800 rounded-lg p-2 text-center border border-slate-700">
                    <Zap size={11} className="text-emerald-400 mx-auto mb-0.5" />
                    <div className="text-sm font-bold text-white">{formatMs(debug.latency)}</div>
                    <div className="text-[9px] text-slate-500">Yanit Suresi</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-2 text-center border border-slate-700">
                    <Cpu size={11} className="text-blue-400 mx-auto mb-0.5" />
                    <div className="text-xs font-bold text-white">{debug.model}</div>
                    <div className="text-[9px] text-slate-500">Model</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-2 text-center border border-slate-700">
                    <Activity size={11} className="text-violet-400 mx-auto mb-0.5" />
                    <div className={`text-sm font-bold ${(debug.parsed?.confidence || 0) >= 80 ? 'text-emerald-400' : 'text-red-400'}`}>
                      %{debug.parsed?.confidence || 0}
                    </div>
                    <div className="text-[9px] text-slate-500">Guven</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] px-2 py-1 rounded-full font-medium text-white bg-indigo-500/30">
                    {STATE_LABELS[debug.detectedState] || debug.detectedState}
                  </span>
                  <span className="text-[9px] px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300">
                    {debug.intent || 'unknown'}
                  </span>
                  {debug.hasMemory && (
                    <span className="text-[9px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300">Musteri Tanindi</span>
                  )}
                </div>

                <div>
                  <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Cikarilan Veriler</label>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 space-y-1 text-[11px] font-mono">
                    {debug.parsed?.customer?.name && (
                      <div className="flex gap-2"><span className="text-slate-600 w-16 shrink-0">musteri</span><span className="text-emerald-400">{debug.parsed.customer.name}</span></div>
                    )}
                    {debug.parsed?.products && debug.parsed.products.length > 0 && (
                      <div className="flex gap-2">
                        <span className="text-slate-600 w-16 shrink-0">urunler</span>
                        <span className="text-blue-300">{debug.parsed.products.map((p: { quantity: number; unit: string; product_name: string }) => `${p.quantity} ${p.unit} ${p.product_name}`).join(', ')}</span>
                      </div>
                    )}
                    {debug.parsed?.address && (
                      <div className="flex gap-2"><span className="text-slate-600 w-16 shrink-0">adres</span><span className="text-amber-300">{debug.parsed.address}</span></div>
                    )}
                    {debug.parsed?.payment && (
                      <div className="flex gap-2"><span className="text-slate-600 w-16 shrink-0">odeme</span><span className="text-violet-300">{debug.parsed.payment}</span></div>
                    )}
                    {!debug.parsed?.customer?.name && !debug.parsed?.products?.length && !debug.parsed?.address && !debug.parsed?.payment && (
                      <span className="text-slate-600 italic">Henuz veri cikarilmadi</span>
                    )}
                  </div>
                </div>

                <div>
                  <button onClick={() => setShowPrompt(!showPrompt)}
                    className="w-full flex items-center justify-between text-[9px] font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300">
                    <span>{showPrompt ? String.fromCharCode(9660) : String.fromCharCode(9654)} System Prompt</span>
                    <button onClick={(e) => { e.stopPropagation(); copyPrompt(); }}
                      className="text-[9px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      <Copy size={9} /> {copied ? 'Kopyalandi' : 'Kopyala'}
                    </button>
                  </button>
                  {showPrompt && (
                    <div className="mt-1 bg-slate-950 text-slate-300 rounded-lg p-2.5 text-[10px] font-mono leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {debug.promptPreview || 'Prompt yuklenemedi'}
                    </div>
                  )}
                </div>

                <div>
                  <button onClick={() => setShowRaw(!showRaw)}
                    className="w-full flex items-center gap-1 text-[9px] font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300">
                    <FileJson size={10} /> {showRaw ? String.fromCharCode(9660) : String.fromCharCode(9654)} Ham JSON Ciktisi
                  </button>
                  {showRaw && (
                    <pre className="mt-1 bg-slate-950 text-green-400 rounded-lg p-2.5 text-[10px] font-mono leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {JSON.stringify(debug.parsed, null, 2)}
                    </pre>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
