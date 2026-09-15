'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { getTenantId } from '@/lib/tenant';
import { unlockAudio, playUrl } from '@/lib/voice-playback';
import { createClapDetector } from '@/lib/clap-detect';

/**
 * AI Çalışanım — konuşma istemcisi.
 * İki mod (varsayılan: 2 Alkış + İsim):
 * - wake_enabled: 👏👏 + "Bilge" → uyanır; oturum açıkken sürekli dinler; uyku ifadesiyle uyur.
 * - push_to_talk_enabled: Bas-ve-Konuş butonu (opsiyonel).
 * Bildirimler (AiEmployeeVoice) bundan bağımsız çalışır — uykuda olsa bile sesli bildirim verir.
 */

const SLEEP_PHRASES = /(tamam teşekkürler|tamam tesekkurler|sessize geç|sessize gec|uyu|iyi günler|iyi gunler|bay bay|görüşürüz|gorusuruz|bitti|kapan)/i;

export function AiEmployeeChat() {
  const tid = getTenantId();
  const [cfg, setCfg] = useState<{ enabled: boolean; wake_enabled: boolean; push_to_talk_enabled: boolean; name: string } | null>(null);
  const [sleeping, setSleeping] = useState(true);
  const [listening, setListening] = useState(false); // aktif oturum STT
  const [waking, setWaking] = useState(false); // alkış sonrası isim dinliyor
  const [processing, setProcessing] = useState(false);
  const [micOn, setMicOn] = useState(false); // gösterge
  const [hint, setHint] = useState('');
  const [lastText, setLastText] = useState('');
  const [lastReply, setLastReply] = useState('');
  const [lastPending, setLastPending] = useState(false);
  const [typed, setTyped] = useState('');
  const [unsupported, setUnsupported] = useState(false);

  const clapRef = useRef(createClapDetector());
  const activeRecRef = useRef<any>(null);
  const wakeRecRef = useRef<any>(null);
  const aliveRef = useRef(true);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  const SR: any = (typeof window !== 'undefined') && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    aliveRef.current = true;
    if (typeof window !== 'undefined' && !SR) setUnsupported(true);
    if (!tid) return;
    fetch(`/api/ai-employee/${tid}`)
      .then((r) => r.json())
      .then((d) => {
        setCfg({ enabled: !!d.enabled, wake_enabled: !!d.wake_enabled, push_to_talk_enabled: !!d.push_to_talk_enabled, name: String(d.name || 'Bilge') });
      })
      .catch(() => {});
    return () => { aliveRef.current = false; stopAll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tid]);

  // Üst bar "AI Çalışanım" butonundan gelen aç/kapa — mikrofon anında tepki verir
  useEffect(() => {
    const onConfig = (e: Event) => {
      const d = (e as CustomEvent)?.detail;
      if (d && typeof d.enabled === 'boolean') setCfg((p) => (p ? { ...p, enabled: d.enabled } : p));
    };
    window.addEventListener('ai-employee-config', onConfig);
    return () => window.removeEventListener('ai-employee-config', onConfig);
  }, []);

  useEffect(() => {
    if (!cfg?.enabled || !cfg.wake_enabled) return;
    if (sleeping) startClap();
    else stopClap();
    return () => stopClap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg?.enabled, cfg?.wake_enabled, sleeping]);

  const stopAll = () => {
    stopClap();
    stopRec(activeRecRef);
    stopRec(wakeRecRef);
  };

  const stopRec = (ref: { current: any }) => {
    if (ref.current) { try { ref.current.abort(); } catch {} ref.current = null; }
  };

  const startClap = () => {
    const c = clapRef.current;
    c.setCallback(onClaps);
    c.start().then((ok) => { if (aliveRef.current) setMicOn(ok && !!cfgRef.current?.wake_enabled); });
  };

  const stopClap = () => { clapRef.current.stop(); setMicOn(false); };

  const onClaps = () => {
    // Alkış tespit edildi → isim dinlemek için kısa STT
    stopClap();
    setWaking(true);
    setHint('Uyanmak için isminizi söyleyin...');
    const r = makeRecognition(false);
    wakeRecRef.current = r;
    const timer = setTimeout(() => { // isim gelmezse uykuya dön
      stopRec(wakeRecRef);
      if (aliveRef.current) { setWaking(false); setHint(''); setSleeping(true); }
    }, 4500);
    r.onresult = (e: any) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) final += e.results[i][0].transcript;
      if (final && final.trim()) {
        clearTimeout(timer);
        const name = (cfgRef.current?.name || 'Bilge').toLowerCase();
        const ww = (name.replace(/\s+/g, '') );
        const norm = final.trim().toLowerCase().replace(/\s+/g, '');
        if (norm.includes(name) || norm.includes(ww)) {
          stopRec(wakeRecRef);
          startSession();
        } else {
          stopRec(wakeRecRef);
          setWaking(false); setHint('');
          if (aliveRef.current && cfgRef.current?.wake_enabled) setSleeping(true);
        }
      }
    };
    r.onerror = () => { clearTimeout(timer); setWaking(false); setHint(''); if (aliveRef.current) setSleeping(true); };
    try { r.start(); } catch { setWaking(false); setHint(''); if (aliveRef.current) setSleeping(true); }
  };

  const startSession = () => {
    setWaking(false); setSleeping(false); setHint('');
    const r = makeRecognition(true);
    activeRecRef.current = r;
    r.onresult = (e: any) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) final += e.results[i][0].transcript;
      if (final && final.trim()) {
        const text = final.trim();
        if (SLEEP_PHRASES.test(text) && !lastPending) { endSession(); return; }
        setLastText(text);
        ask(text);
      }
    };
    r.onend = () => {
      // oturum hâlâ açıksa dinlemeye devam et
      if (aliveRef.current && !sleeping && activeRecRef.current) {
        try { activeRecRef.current.start(); } catch {}
      }
    };
    r.onerror = () => { /* sessiz */ };
    try { r.start(); setListening(true); setMicOn(true); } catch { setListening(false); }
  };

  const endSession = () => {
    stopRec(activeRecRef);
    setListening(false); setSleeping(true); setMicOn(false); setHint('');
    setLastReply(''); setLastPending(false);
  };

  const makeRecognition = (continuous: boolean) => {
    const r = new SR();
    r.lang = 'tr-TR';
    r.continuous = continuous;
    r.interimResults = false;
    r.maxAlternatives = 1;
    return r;
  };

  const ask = async (text: string) => {
    setProcessing(true);
    try {
      unlockAudio();
      const r = await fetch(`/api/ai-employee/${tid}/conversation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }).then((res) => res.json());
      const reply = r?.reply || 'Anlayamadım, tekrar eder misiniz?';
      setLastReply(reply);
      setLastPending(Boolean(r?.pending));
      const sp = await fetch(`/api/ai-employee/${tid}/voice/speak`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reply }),
      }).then((res) => res.json());
      if (sp?.audioUrl) await playUrl(sp.audioUrl);
    } catch { /* sessiz */ }
    setProcessing(false);
  };

  const ptt = () => {
    // Bas-ve-Konuş: tek atışlık dinleme
    if (processing || listening) return;
    unlockAudio();
    const r = makeRecognition(false);
    r.onresult = (e: any) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) final += e.results[i][0].transcript;
      if (final && final.trim()) { setLastText(final.trim()); ask(final.trim()); }
    };
    r.onerror = () => {};
    try { r.start(); setMicOn(true); setTimeout(() => setMicOn(false), 6000); } catch {}
  };

  const submitTyped = () => {
    const t = typed.trim();
    if (!t || processing) return;
    setLastText(t); setTyped('');
    ask(t);
  };

  const showMic = micOn || waking || listening || processing;
  const showPtt = cfg?.push_to_talk_enabled && !listening && !waking;

  return (
    <>
      {unsupported ? (
        <div className="fixed bottom-6 right-6 z-40 max-w-xs bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-[11px] text-amber-800 dark:text-amber-200 shadow-lg">
          Sesli konuşma bu tarayıcıda desteklenmiyor. Chrome veya Edge kullanın.
        </div>
      ) : (
        <>
          {showPtt && (
            <button onClick={ptt} aria-label="Bas ve Konuş"
              className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all border-2 bg-indigo-600 border-indigo-400/60 hover:bg-indigo-700">
              <Mic className="w-6 h-6 text-white" />
            </button>
          )}
          {showMic && !showPtt && (
            <button aria-label="Mikrofon açık" className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all border-2 bg-red-500 border-red-300 animate-pulse pointer-events-none">
              <Mic className="w-6 h-6 text-white" />
            </button>
          )}
          {showMic && !showPtt && (
            <div className="fixed bottom-24 right-6 z-40 text-[10px] font-semibold text-red-500 bg-white/90 dark:bg-slate-800/90 border border-red-200 dark:border-red-800 rounded-full px-2.5 py-1 shadow">
              🎙️ Mikrofon açık
            </div>
          )}
        </>
      )}

      {(waking || listening || processing || lastReply || hint || typed) && (
        <div className="fixed bottom-24 right-6 z-40 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3 space-y-2">
          {waking && <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">{hint}</p>}
          {listening && <p className="text-[11px] text-red-500 font-semibold">Dinliyorum... (sessize geçmek için "tamam teşekkürler" deyin)</p>}
          {processing && <p className="text-[11px] text-indigo-500 font-semibold">Düşünüyorum...</p>}
          {lastText && <p className="text-[11px] text-slate-500 dark:text-slate-400">Sen: {lastText}</p>}
          {lastReply && <p className="text-[11px] text-slate-800 dark:text-slate-200 font-medium">{lastReply}</p>}
          {hint && !waking && <p className="text-[11px] text-slate-400">{hint}</p>}

          {lastPending && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => ask('evet')} className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold">Onayla</button>
              <button onClick={() => ask('hayır')} className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[11px] font-semibold">İptal</button>
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700">
            <input value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitTyped(); }}
              placeholder="Yazın ve Enter'a basın..." className="flex-1 px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/30" />
            <button onClick={submitTyped} className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold">Gönder</button>
          </div>
        </div>
      )}
    </>
  );
}