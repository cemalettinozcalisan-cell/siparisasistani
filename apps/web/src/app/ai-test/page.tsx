'use client';

import { getTenantId } from '@/lib/tenant';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Cpu, ChevronDown, ChevronUp, Trash2, Copy, Activity, Zap, Clock, FileJson, MessageSquare, Phone, Camera, RefreshCw } from 'lucide-react';

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
  { value: 'phone', label: 'Telefon (NetGSM)', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'instagram', label: 'Instagram DM', icon: Camera },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
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

  return (
    <div className="p-4 space-y-3 h-[calc(100vh-2rem)] flex flex-col">
      {/* Top Control Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">AI Test Lab</span>
        </div>
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-600" />
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-gray-400">Kanal:</label>
          <select value={channel} onChange={(e) => setChannel(e.target.value)}
            className="px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
            {CHANNEL_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-gray-400">Müşteri Tel:</label>
          <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Boş = yeni müşteri"
            className="px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white w-36" />
        </div>
        <button onClick={reset}
          className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700">
          <RefreshCw size={13} /> Sıfırla
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Left: Chat */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col min-h-0">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">AI Asistan</span>
            {stateTimeline.length > 0 && (
              <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${STATE_COLORS[stateTimeline[stateTimeline.length - 1]] || 'bg-slate-100 text-slate-500'}`}>
                {STATE_LABELS[stateTimeline[stateTimeline.length - 1]] || stateTimeline[stateTimeline.length - 1]}
              </span>
            )}
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-sm'
                }`}>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
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

        {/* Right: Debugger Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 flex-shrink-0">
            <Activity className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Debugger</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {!debug ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 py-8">
                <div className="text-center text-xs">Soldaki panelden mesaj gönderince<br/>debug bilgileri burada görünecek</div>
              </div>
            ) : (
              <>
                {/* State Timeline */}
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">State Geçişleri</label>
                  <div className="flex items-center gap-1 flex-wrap">
                    {stateTimeline.map((s, i) => (
                      <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        i === stateTimeline.length - 1 ? 'ring-1 ring-offset-1 ring-indigo-300 ' + STATE_COLORS[s] : (STATE_COLORS[s] || 'bg-slate-50 text-slate-400') + ' opacity-50'
                      }`}>
                        {STATE_LABELS[s] || s}
                      </span>
                    ))}
                    {stateTimeline.length === 0 && <span className="text-xs text-gray-400">—</span>}
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-500 mb-0.5"><Zap size={11} /></div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{formatMs(debug.latency)}</div>
                    <div className="text-[9px] text-gray-400">Yanıt Süresi</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-500 mb-0.5"><Cpu size={11} /></div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{debug.model}</div>
                    <div className="text-[9px] text-gray-400">Model</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-violet-500 mb-0.5"><Activity size={11} /></div>
                    <div className={`text-sm font-bold ${(debug.parsed?.confidence || 0) >= 80 ? 'text-emerald-600' : 'text-red-500'}`}>
                      %{debug.parsed?.confidence || 0}
                    </div>
                    <div className="text-[9px] text-gray-400">Güven</div>
                  </div>
                </div>

                {/* Live State + Intent */}
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${STATE_COLORS[debug.detectedState] || 'bg-slate-100 text-slate-500'}`}>
                    🎯 {STATE_LABELS[debug.detectedState] || debug.detectedState}
                  </span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                    {debug.intent || 'unknown'}
                  </span>
                  {debug.hasMemory && (
                    <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">🔄 Müşteri Tanındı</span>
                  )}
                  <span className="text-[10px] text-gray-400 ml-auto">{debug.channel}</span>
                </div>

                {/* Extracted Data */}
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Çıkarılan Veriler</label>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2.5 space-y-1 text-xs">
                    {debug.parsed?.customer?.name && (
                      <div className="flex gap-2"><span className="text-gray-400 w-16 shrink-0">Müşteri:</span><span className="text-gray-700 dark:text-slate-300 font-medium">{debug.parsed.customer.name}</span></div>
                    )}
                    {debug.parsed?.products && debug.parsed.products.length > 0 && (
                      <div className="flex gap-2">
                        <span className="text-gray-400 w-16 shrink-0">Ürünler:</span>
                        <span className="text-gray-700 dark:text-slate-300">{debug.parsed.products.map((p: { quantity: number; unit: string; product_name: string }) => `${p.quantity} ${p.unit} ${p.product_name}`).join(', ')}</span>
                      </div>
                    )}
                    {debug.parsed?.address && (
                      <div className="flex gap-2"><span className="text-gray-400 w-16 shrink-0">Adres:</span><span className="text-gray-700 dark:text-slate-300">{debug.parsed.address}</span></div>
                    )}
                    {debug.parsed?.payment && (
                      <div className="flex gap-2"><span className="text-gray-400 w-16 shrink-0">Ödeme:</span><span className="text-gray-700 dark:text-slate-300">{debug.parsed.payment}</span></div>
                    )}
                    {!debug.parsed?.customer?.name && !debug.parsed?.products?.length && !debug.parsed?.address && !debug.parsed?.payment && (
                      <span className="text-gray-400 italic">Henüz veri çıkarılmadı</span>
                    )}
                  </div>
                </div>

                {/* System Prompt Accordion */}
                <div>
                  <button onClick={() => setShowPrompt(!showPrompt)}
                    className="w-full flex items-center justify-between text-[10px] font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600">
                    <span>{showPrompt ? '▼' : '▶'} System Prompt</span>
                    <button onClick={(e) => { e.stopPropagation(); copyPrompt(); }}
                      className="text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                      <Copy size={10} /> {copied ? 'Kopyalandı' : 'Kopyala'}
                    </button>
                  </button>
                  {showPrompt && (
                    <div className="mt-1 bg-slate-900 text-slate-300 rounded-lg p-2.5 text-[10px] font-mono leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {debug.promptPreview || 'Prompt yüklenemedi'}
                    </div>
                  )}
                </div>

                {/* Raw JSON Toggle */}
                <div>
                  <button onClick={() => setShowRaw(!showRaw)}
                    className="w-full flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600">
                    <FileJson size={11} /> {showRaw ? '▼' : '▶'} Ham JSON Çıktısı
                  </button>
                  {showRaw && (
                    <pre className="mt-1 bg-slate-900 text-emerald-400 rounded-lg p-2.5 text-[10px] font-mono leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
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
