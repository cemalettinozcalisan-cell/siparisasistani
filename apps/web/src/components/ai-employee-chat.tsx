'use client';

import { useEffect, useRef, useState } from 'react';
import { getTenantId } from '@/lib/tenant';
import { unlockAudio, playUrl } from '@/lib/voice-playback';

/**
 * AI Çalışanım — Bas ve Konuş (Aşama 4a MVP).
 * Push-to-talk: butona bas → STT (Web Speech API, tr-TR) → DeepSeek cevap → ElevenLabs TTS → oynat.
 */
export function AiEmployeeChat() {
  const tid = getTenantId();
  const [state, setState] = useState<'idle' | 'listening' | 'processing'>('idle');
  const [lastText, setLastText] = useState('');
  const [lastReply, setLastReply] = useState('');
  const [unsupported, setUnsupported] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setUnsupported(true); return; }
    const rec = new SR();
    rec.lang = 'tr-TR';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recRef.current = rec;

    rec.onresult = async (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript || '';
      if (!text) { setState('idle'); return; }
      setLastText(text);
      setState('processing');
      await ask(text);
    };
    rec.onerror = () => setState('idle');
    rec.onend = () => setState((s) => (s === 'processing' ? s : 'idle'));

    return () => { try { rec.abort(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tid]);

  const ask = async (text: string) => {
    try {
      unlockAudio();
      const r = await fetch(`/api/ai-employee/${tid}/conversation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }).then((res) => res.json());
      const reply = r?.reply || 'Anlayamadım, tekrar eder misiniz?';
      setLastReply(reply);
      const sp = await fetch(`/api/ai-employee/${tid}/voice/speak`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reply }),
      }).then((res) => res.json());
      if (sp?.audioUrl) await playUrl(sp.audioUrl);
    } catch { /* sessiz */ }
    setState('idle');
  };

  const start = () => {
    unlockAudio();
    try { recRef.current?.start(); setState('listening'); } catch { /* zaten çalışıyor olabilir */ }
  };
  const stop = () => {
    try { recRef.current?.stop(); } catch {}
  };

  return (
    <>
      {unsupported ? null : (
        <button
          onPointerDown={start}
          onPointerUp={stop}
          onPointerLeave={stop}
          aria-label="AI Çalışanım ile konuş"
          className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all border-2 ${state === 'listening' ? 'bg-red-500 border-red-300 scale-110' : state === 'processing' ? 'bg-indigo-500 border-indigo-300' : 'bg-indigo-600 border-indigo-400/60 hover:bg-indigo-700'}`}
        >
          <Mic className="w-6 h-6 text-white" />
        </button>
      )}
      {(state !== 'idle' || lastReply) && (
        <div className="fixed bottom-24 right-6 z-40 max-w-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3 space-y-1">
          {state === 'listening' && <p className="text-[11px] text-red-500 font-semibold">Dinliyorum...</p>}
          {state === 'processing' && <p className="text-[11px] text-indigo-500 font-semibold">Düşünüyorum...</p>}
          {lastText && <p className="text-[11px] text-slate-500 dark:text-slate-400">Sen: {lastText}</p>}
          {lastReply && <p className="text-[11px] text-slate-800 dark:text-slate-200 font-medium">{lastReply}</p>}
        </div>
      )}
    </>
  );
}

import { Mic } from 'lucide-react';