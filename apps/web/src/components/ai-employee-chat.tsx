'use client';

import { useEffect, useState } from 'react';
import { Mic } from 'lucide-react';
import { getTenantId } from '@/lib/tenant';
import { unlockAudio, playUrl } from '@/lib/voice-playback';

/**
 * AI Çalışanım — Sesli konuşma (Aşama 4a MVP).
 * Tıkla-başlat / tıkla-durdur (toggle). Final sonuç gelince otomatik sor.
 * Elle yazma yedeği de var (STT çalışmazsa).
 */
export function AiEmployeeChat() {
  const tid = getTenantId();
  const [state, setState] = useState<'idle' | 'listening' | 'processing'>('idle');
  const [live, setLive] = useState('');
  const [lastText, setLastText] = useState('');
  const [lastReply, setLastReply] = useState('');
  const [error, setError] = useState('');
  const [unsupported, setUnsupported] = useState(false);
  const [typed, setTyped] = useState('');
  const [rec, setRec] = useState<any>(null);
  const [pending, setPending] = useState(false);

  const SR: any = (typeof window !== 'undefined') && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    if (typeof window !== 'undefined' && !SR) setUnsupported(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = async (text: string) => {
    setState('processing');
    setError('');
    try {
      unlockAudio();
      const r = await fetch(`/api/ai-employee/${tid}/conversation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }).then((res) => res.json());
      const reply = r?.reply || 'Anlayamadım, tekrar eder misiniz?';
      setLastReply(reply);
      setPending(Boolean(r?.pending));
      const sp = await fetch(`/api/ai-employee/${tid}/voice/speak`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reply }),
      }).then((res) => res.json());
      if (sp?.audioUrl) await playUrl(sp.audioUrl);
    } catch {
      setError('Cevaplayamadım, bağlantı hatası.');
    }
    setState('idle');
  };

  const quickSend = (v: string) => {
    if (state === 'processing') return;
    setPending(false);
    setLastText(v);
    ask(v);
  };

  const toggleMic = () => {
    unlockAudio();
    if (rec) { stopMic(); return; }
    startMic();
  };

  const startMic = () => {
    if (!SR) { setUnsupported(true); return; }
    setError('');
    setLive('');
    const r = new SR();
    r.lang = 'tr-TR';
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onstart = () => setState('listening');
    r.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tr = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += tr;
        else interim += tr;
      }
      if (final && final.trim()) {
        const text = final.trim();
        setLastText(text);
        try { r.stop(); } catch {}
        setRec(null);
        ask(text);
      } else {
        setLive(interim);
      }
    };
    r.onerror = (e: any) => {
      const map: Record<string, string> = {
        'not-allowed': 'Mikrofon izni verilmedi. Adres çubuğundaki mikrofon ikonundan izin verin.',
        'no-speech': 'Konuşma duyulmadı, tekrar deneyin.',
        'audio-capture': 'Mikrofon bulunamadı.',
        'network': 'Ağ hatası.',
      };
      setError(map[e?.error] || 'Ses algılanamadı.');
      setState('idle');
    };
    r.onend = () => {
      setRec(null);
      setState((s) => (s === 'processing' ? s : 'idle'));
    };

    try {
      r.start();
      setRec(r);
    } catch {
      setError('Mikrofon başlatılamadı. Sayfaya tıklayıp tekrar deneyin.');
      setState('idle');
    }
  };

  const stopMic = () => {
    const r = rec;
    if (r) { try { r.stop(); } catch {} }
  };

  const submitTyped = () => {
    const t = typed.trim();
    if (!t || state === 'processing') return;
    setLastText(t);
    setTyped('');
    ask(t);
  };

  return (
    <>
      <button
        onClick={toggleMic}
        aria-label="AI Çalışanım ile konuş"
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all border-2 ${state === 'listening' ? 'bg-red-500 border-red-300 scale-110 animate-pulse' : state === 'processing' ? 'bg-indigo-500 border-indigo-300' : 'bg-indigo-600 border-indigo-400/60 hover:bg-indigo-700'}`}
      >
        <Mic className="w-6 h-6 text-white" />
      </button>

      {(state !== 'idle' || lastReply || error || live) && (
        <div className="fixed bottom-24 right-6 z-40 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3 space-y-2">
          {state === 'listening' && <p className="text-[11px] text-red-500 font-semibold">Dinliyorum... <span className="text-slate-500 font-normal">{live}</span></p>}
          {state === 'processing' && <p className="text-[11px] text-indigo-500 font-semibold">Düşünüyorum...</p>}
          {lastText && <p className="text-[11px] text-slate-500 dark:text-slate-400">Sen: {lastText}</p>}
          {lastReply && <p className="text-[11px] text-slate-800 dark:text-slate-200 font-medium">{lastReply}</p>}
          {error && <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}

          {pending && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => quickSend('evet')} className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold">Onayla</button>
              <button onClick={() => quickSend('iptal')} className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[11px] font-semibold">İptal</button>
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitTyped(); }}
              placeholder="Yazın ve Enter'a basın..."
              className="flex-1 px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <button onClick={submitTyped} className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold">Gönder</button>
          </div>
        </div>
      )}
    </>
  );
}