'use client';

import { useEffect, useState } from 'react';
import { Play, StopCircle, Bot, User, Phone, MessageCircle, Instagram, MessageSquare, Sparkles, Zap, AlertTriangle, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { getTenantId } from '@/lib/tenant';

interface Persona {
  id: string; name: string; phone: string; channel: string;
  behaviorPrompt: string; goal: string; category: string;
}

interface SimResult {
  personaId: string; personaName: string; channel: string;
  success: boolean; orderCreated: boolean; orderNumber?: string;
  turns: number; duration: number; error?: string;
  transcript: { role: string; content: string }[];
}

function ChannelIcon({ channel, size = 14 }: { channel: string; size?: number }) {
  switch (channel) {
    case 'phone': return <Phone size={size} />;
    case 'whatsapp': return <MessageCircle size={size} />;
    case 'instagram': return <Instagram size={size} />;
    case 'sms': return <MessageSquare size={size} />;
    default: return <Bot size={size} />;
  }
}

function channelGradient(channel: string) {
  switch (channel) {
    case 'phone': return 'from-blue-500 to-blue-600';
    case 'whatsapp': return 'from-emerald-400 to-emerald-600';
    case 'instagram': return 'from-pink-500 to-purple-600';
    case 'sms': return 'from-sky-400 to-blue-500';
    default: return 'from-slate-400 to-slate-500';
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  'Normal': 'bg-emerald-100 text-emerald-700',
  'Toptan': 'bg-blue-100 text-blue-700',
  'Pazarlık': 'bg-amber-100 text-amber-700',
  'Sorunlu': 'bg-orange-100 text-orange-700',
  'Öfkeli': 'bg-red-100 text-red-700',
  'Aceleci': 'bg-violet-100 text-violet-700',
  'Kararsız': 'bg-purple-100 text-purple-700',
  'Edge': 'bg-slate-800 text-white',
  'İptal': 'bg-gray-200 text-gray-700',
  'Çoklu Ürün': 'bg-cyan-100 text-cyan-700',
  'Sosyal': 'bg-pink-100 text-pink-700',
};

export default function SimulatorPage() {
  const [tid, setTid] = useState('');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [running, setRunning] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<{ role: string; content: string }[]>([]);
  const [results, setResults] = useState<SimResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => { setTid(getTenantId()); }, []);
  useEffect(() => {
    if (!tid) return;
    fetch(`/api/simulator/personas`)
      .then(r => r.json()).then(d => {
        setPersonas(d);
        if (d.length > 0) setSelectedId(d[0].id);
      }).catch(() => {});
  }, [tid]);

  const selected = personas.find(p => p.id === selectedId);

  const runSingle = async () => {
    if (!selected || !tid) return;
    setRunning(true);
    setLiveTranscript([]);
    try {
      const res = await fetch(`/api/simulator/run/${tid}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: selected.id }),
      });
      const data: SimResult = await res.json();
      setResults(prev => [data, ...prev].slice(0, 50));
      setLiveTranscript(data.transcript);
    } catch (e) { console.error(e); }
    setRunning(false);
  };

  const runAll = async () => {
    if (!tid) return;
    setRunningAll(true);
    setResults([]);
    try {
      const res = await fetch(`/api/simulator/run-all/${tid}`, { method: 'POST' });
      const data: SimResult[] = await res.json();
      setResults(data);
    } catch (e) { console.error(e); }
    setRunningAll(false);
    setShowResults(true);
  };

  const summary = {
    total: results.length,
    success: results.filter(r => r.orderCreated).length,
    failed: results.filter(r => !r.orderCreated && !r.error).length,
    errors: results.filter(r => !!r.error).length,
    avgTurns: results.length > 0 ? Math.round(results.reduce((s, r) => s + r.turns, 0) / results.length) : 0,
    avgDuration: results.length > 0 ? Math.round(results.reduce((s, r) => s + r.duration, 0) / results.length / 1000) : 0,
    humanNeeded: results.filter(r => r.transcript.some(t => t.content === 'İnsan müdahalesi gerekli')).length,
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap size={22} className="text-amber-500" /> Sistem Test & Simülasyon Paneli
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          30 farklı AI müşteri ile sistem testi — canlı API gerekmez
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Persona selector */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 block">Müşteri Personası</label>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none">
              {personas.map(p => (
                <option key={p.id} value={p.id}>{p.id} — {p.name} ({p.category} — {p.channel})</option>
              ))}
            </select>
          </div>

          {/* Persona detail */}
          {selected && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{selected.name}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CATEGORY_COLORS[selected.category] || 'bg-slate-100'}`}>{selected.category}</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-300">
                  <ChannelIcon channel={selected.channel} size={10} /> {selected.channel}
                </span>
              </div>
              <p className="text-[11px] text-slate-500"><span className="font-medium">Hedef:</span> {selected.goal}</p>
              <p className="text-[11px] text-slate-400 leading-relaxed"><span className="font-medium">Davranış:</span> {selected.behaviorPrompt}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={runSingle} disabled={running || runningAll}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md disabled:opacity-50">
            <Play size={16} /> {running ? 'Çalışıyor...' : 'Tekli Test Başlat'}
          </button>
          <button onClick={runAll} disabled={running || runningAll}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-semibold transition-all shadow-md disabled:opacity-50">
            <Zap size={16} /> {runningAll ? '30 Persona Çalışıyor...' : '30 Personayı Çalıştır'}
          </button>
          {runningAll && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <span className="animate-pulse w-2 h-2 rounded-full bg-amber-500" /> Çalışıyor — 30 test tamamlanana kadar bekleyin...
            </span>
          )}
        </div>
      </div>

      {/* Live Stream */}
      {liveTranscript.length > 0 && running && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">CANLI TEST</span>
            <span className="text-[10px] text-slate-400 ml-auto">{selected?.name} — {selected?.channel}</span>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {liveTranscript.map((t, i) => (
              <div key={i} className={`flex ${t.role === 'customer' ? 'justify-start' : t.role === 'assistant' ? 'justify-end' : 'justify-center'}`}>
                {t.role === 'system' ? (
                  <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-[10px] text-slate-500 font-medium">{t.content}</div>
                ) : (
                  <div className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-sm ${
                    t.role === 'customer'
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                      : 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-br-sm'
                  }`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {t.role === 'customer' ? (
                        <span className="text-[10px] font-semibold opacity-70 flex items-center gap-1"><User size={10} /> {selected?.name}</span>
                      ) : (
                        <span className="text-[10px] font-semibold opacity-70 flex items-center gap-1"><Bot size={10} /> AI Asistan</span>
                      )}
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{t.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <button onClick={() => setShowResults(!showResults)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
            <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-500" /> Test Sonuçları ({results.length} test)
            </span>
            {showResults ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          {showResults && (
            <div className="border-t border-slate-100 dark:border-slate-700 p-5 space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { v: summary.success, l: 'Başarılı Sipariş', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: CheckCircle2 },
                  { v: summary.failed, l: 'Sipariş Yok', cls: 'bg-slate-50 border-slate-200 text-slate-700', icon: XCircle },
                  { v: summary.errors, l: 'Hata', cls: 'bg-red-50 border-red-200 text-red-700', icon: AlertTriangle },
                  { v: summary.humanNeeded, l: 'İnsan Gerekli', cls: 'bg-amber-50 border-amber-200 text-amber-700', icon: AlertTriangle },
                ].map((s, i) => { const Ic = s.icon; return (
                  <div key={i} className={`rounded-xl border p-3 text-center ${s.cls}`}>
                    <Ic size={16} className="mx-auto mb-1" />
                    <div className="text-xl font-bold">{s.v}</div>
                    <div className="text-[10px] opacity-70">{s.l}</div>
                  </div>
                );})}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock size={12} /> Ort. {summary.avgDuration}s/görüşme</span>
                <span>Ort. {summary.avgTurns} tur</span>
              </div>

              {/* Results list */}
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg text-xs ${r.orderCreated ? 'bg-emerald-50 dark:bg-emerald-900/10' : r.error ? 'bg-red-50 dark:bg-red-900/10' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${r.orderCreated ? 'bg-emerald-500 text-white' : r.error ? 'bg-red-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                      {r.orderCreated ? '✓' : r.error ? '!' : '—'}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 w-6">{r.personaId}</span>
                    <span className="text-slate-600 dark:text-slate-400 w-28 truncate">{r.personaName}</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px]">
                      <ChannelIcon channel={r.channel} size={9} />
                    </span>
                    <span className={r.orderCreated ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>{r.turns} tur</span>
                    <span className="text-slate-400">{Math.round(r.duration / 1000)}s</span>
                    {r.orderNumber && <span className="text-emerald-600 font-mono text-[10px]">#{r.orderNumber}</span>}
                    {r.error && <span className="text-red-500 truncate max-w-[150px]">{r.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
        <Sparkles size={12} className="text-amber-500" /> Her test, seçilen persona ile sistemin AI sipariş motorunu gerçek zamanlı test eder. Sonuçlar Görüşmeler sayfasına kaydedilir.
      </div>
    </div>
  );
}
