'use client';

import { useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { getTenantId } from '@/lib/tenant';
import { unlockAudio, playUrl } from '@/lib/voice-playback';

/**
 * AI Çalışanım — Bas ve Konuş (Aşama 4a MVP).
 * Push-to-talk: bas → STT (Web Speech API, tr-TR) → DeepSeek cevap → ElevenLabs TTS → oynat.
 * Sağlam: her oturum için yeni recognition, canlı interim, görünür hata.
 */
export function AiEmployeeChat() {
  const tid = getTenantId();
  const [state, setState] = useState<'idle' | 'listening' | 'processing'>('idle');
  const [live, setLive] = useState('');
  const [lastText, setLastText] = useState('');
  const [lastReply, setLastReply] = useState('');
  const [error, setError] = useState('');
  const [unsupported, setUnsupported] = useState(false);
  const recRef = useRef<any>(null);
  const busyRef = useRef(false);

  const SR: any = (typeof window !== 'undefined') && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  if (typeof window !== 'undefined' && !SR) {
    // unsupported — yalnızca bir kez
  }

  const makeRecognition = () => {
    if (!SR) { setUnsupported(true); return null; }
    const rec = new SR();
    rec.lang = 'tr-TR';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => { setError(''); setLive(''); setState('listening'); };

    rec.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tr = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += tr;
        else interim += tr;
      }
      if (final) {
        const text = final.trim();
        setLive('');
        if (text) {
          setLastText(text);
          setState('processing');
          busyRef.current = true;
          ask(text);
        }
      } else {
        setLive(interim);
      }
    };

    rec.onerror = (e: any) => {
      const map: Record<string, string> = {
        'not-allowed': 'Mikrofon izni verilmedi. Tarayıcıda mikrofona izin verin.',
        'no-speech': 'Konuşma duyulmadı, tekrar deneyin.',
        'audio-capture': 'Mikrofon bulunamadı.',
        'network': 'Ağ hatası.',
        'aborted': '',
      };
      setError(map[e?.error] || 'Ses algılanamadı.');
      setState('idle');
      busyRef.current = false;
    };

    rec.onend = () => {
      // session bitti — yeni başlatmaya hazır
      recRef.current = null;
      if (!busyRef.current) setState('idle');
    };

    return rec;
  };

  const start = () => {
    unlockAudio();
    setError('');
    if (recRef.current) { try { recRef.current.abort(); } catch {} recRef.current = null; }
    const rec = makeRecognition();
    if (!rec) return;
    try {
      rec.start();
      recRef.current = rec;
    } catch {
      setError('Mikrofon başlatılamadı. Sayfaya tıklayıp tekrar deneyin.');
    }
  };

  const stop = () => {
    const rec = recRef.current;
    if (rec) { try { rec.stop(); } catch {} }
  };

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
    } catch {
      setError('Cevaplayamadım, bağlantı hatası.');
    }
    busyRef.current = false;
    setState('idle');
  };

  return (
    <>
      {unsupported ? (
        <div className="fixed bottom-6 right-6 z-40 max-w-xs bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-[11px] text-amber-800 dark:text-amber-200 shadow-lg">
          Sesli konuşma bu tarayıcıda desteklenmiyor. Chrome veya Edge kullanın.
        </div>
      ) : (
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
      {(state !== 'idle' || lastReply || error || live) && (
        <div className="fixed bottom-24 right-6 z-40 max-w-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3 space-y-1">
          {state === 'listening' && <p className="text-[11px] text-red-500 font-semibold">Dinliyorum... <span className="text-slate-500">{live}</span></p>}
          {state === 'processing' && <p className="text-[11px] text-indigo-500 font-semibold">Düşünüyorum...</p>}
          {lastText && <p className="text-[11px] text-slate-500 dark:text-slate-400">Sen: {lastText}</p>}
          {lastReply && <p className="text-[11px] text-slate-800 dark:text-slate-200 font-medium">{lastReply}</p>}
          {error && <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </>
  );
}