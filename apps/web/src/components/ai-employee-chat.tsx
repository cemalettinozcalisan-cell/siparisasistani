'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { getTenantId } from '@/lib/tenant';
import { unlockAudio, playUrl, stopPlayback } from '@/lib/voice-playback';
import { createClapDetector } from '@/lib/clap-detect';
import { openRealtime, createAudioPlayer, primeRealtimeAudio, type RealtimeHandle, type AudioPlayer } from '@/lib/gemini-realtime';

/**
 * AI Çalışanım — konuşma istemcisi (Whisper STT + VAD).
 * İki mod (varsayılan: 2 Alkış + İsim):
 * - wake_enabled: 👏👏 + isim → uyanır; oturum açıkken sürekli dinler; uyku ifadesiyle uyur.
 * - push_to_talk_enabled: Bas-ve-Konuş butonu (opsiyonel).
 * Ses, tarayıcıda kaydedilip API'de Whisper (gpt-4o-transcribe) ile Türkçe metne çevrilir.
 * Bildirimler (AiEmployeeVoice) bundan bağımsız çalışır.
 */

const SLEEP_PHRASES = /(tamam teşekkürler|tamam tesekkurler|sessize geç|sessize gec|uyu|iyi günler|iyi gunler|bay bay|görüşürüz|gorusuruz|bitti|kapan)/i;

const tokenSim = (a: string, b: string): number => {
  const A = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const B = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (!A.size || !B.size) return 0;
  let c = 0;
  A.forEach((w) => { if (B.has(w)) c++; });
  return c / Math.max(A.size, B.size);
};

const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  const m = a.length; const n = b.length;
  if (!m) return n; if (!n) return m;
  const d: number[][] = [];
  for (let i = 0; i <= m; i++) { d[i] = [i]; for (let j = 1; j <= n; j++) d[i][j] = 0; }
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[m][n];
};

/** Türkçe karakterleri ASCII'ye indirger ("gökçe" → "gokce") — Whisper yazım farklarını yok eder. */
const trAscii = (s: string): string => s
  .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
  .replace(/Ç/g, 'C').replace(/Ğ/g, 'G').replace(/İ/g, 'I').replace(/Ö/g, 'O').replace(/Ş/g, 'S').replace(/Ü/g, 'U');

/** Wake isim eşleşmesi: "bilge" → "bilge", "bilgi", "bilgey", "bilg", "gökçe"→"gokce" gibi yakın yazımları kabul eder. */
const nameMatches = (norm: string, name: string, ww: string): boolean => {
  const n = trAscii(norm); const nm = trAscii(name); const w = trAscii(ww);
  if (n.includes(nm) || n.includes(w)) return true;
  if (n.length >= nm.length - 1 && (levenshtein(n.slice(0, nm.length), nm) <= 1 || levenshtein(n, nm) <= 1)) return true;
  for (const word of n.split(/\s+/)) {
    if (levenshtein(word, nm) <= 1) return true;
  }
  return false;
};

// VAD (ses aktivitesi) kalibrasyonu — gürültüye dayanıklı:
// - sustainMs: konuşma sayılması için eşik üstü ardışık süre (tıklama ~<150ms elenir)
// - minSpeechMs: gerçek utterance için birikmiş konuşma süresi
// - silenceMs: cümle içi duraklamaları yutmak için uzun tutulur (2000ms)
const VAD = {
  speechRms: 0.035,
  sustainMs: 200,
  minSpeechMs: 350,
  silenceMs: 2000,
  maxMs: 15000,
  bargeRms: 0.05,
  bargeSustainMs: 250,
};

export function AiEmployeeChat() {
  const tid = getTenantId();
  const [cfg, setCfg] = useState<{ enabled: boolean; wake_enabled: boolean; push_to_talk_enabled: boolean; name: string } | null>(null);
  const [sleeping, setSleeping] = useState(true);
  const [listening, setListening] = useState(false); // aktif oturum dinleme
  const [waking, setWaking] = useState(false); // alkış sonrası isim dinliyor
  const [processing, setProcessing] = useState(false);
  const [micOn, setMicOn] = useState(false); // gösterge
  const [hint, setHint] = useState('');
  const [wakeDiag, setWakeDiag] = useState(''); // geçici teşhis
  const [sessionDiag, setSessionDiag] = useState(''); // geçici oturum teşhis
  const [lastText, setLastText] = useState('');
  const [lastReply, setLastReply] = useState('');
  const [lastPending, setLastPending] = useState(false);
  const [typed, setTyped] = useState('');
  const [unsupported, setUnsupported] = useState(false);
  const [rtActive, setRtActive] = useState(false); // Gemini Live oturumu aktif
  const [pttActive, setPttActive] = useState(false); // Bas-Konuş ile açılan oturum

  const clapRef = useRef(createClapDetector());
  const clapGenRef = useRef(0); // startClap nesil sayacı — eski promise micOn'u bozamaz
  const processingRef = useRef(false);
  const sessionOpenRef = useRef(false);
  const restartTimerRef = useRef<any>(null);
  const bargeCountRef = useRef(0); // döngü koruması: oturum başına en fazla 3 barge-in
  const aliveRef = useRef(true);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  const micStreamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const busyRef = useRef(false); // aynı anda tek kayıt
  const rtHandleRef = useRef<RealtimeHandle | null>(null);
  const rtPlayerRef = useRef<AudioPlayer | null>(null);
  const rtActiveRef = useRef(false);
  const rtLastActivityRef = useRef(0);
  const rtWatchRef = useRef<any>(null);
  const rtReconnectRef = useRef(0); // oturum başına otomatik reconnect sayısı (döngü koruması)

  useEffect(() => {
    aliveRef.current = true;
    if (typeof window !== 'undefined' && (typeof navigator.mediaDevices === 'undefined' || typeof navigator.mediaDevices.getUserMedia !== 'function' || typeof window.MediaRecorder === 'undefined')) setUnsupported(true);
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
      if (d && typeof d.enabled === 'boolean') {
        setCfg((p) => (p ? { ...p, enabled: d.enabled } : p));
        if (!d.enabled) { stopRealtime(); endSession(); }
        else { try { unlockAudio(); primeRealtimeAudio(); } catch {} } // jest içinde context'leri ısıt
      }
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
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    stopClap();
    stopMicStream();
    stopRealtime();
    sessionOpenRef.current = false;
  };

  const startClap = () => {
    const gen = ++clapGenRef.current;
    const c = clapRef.current;
    c.setCallback(onClaps);
    c.start().then((ok) => {
      console.log('[chat] startClap sonucu:', ok, 'gen:', gen, 'current:', clapGenRef.current);
      if (aliveRef.current && gen === clapGenRef.current) setMicOn(ok && !!cfgRef.current?.wake_enabled);
    });
  };

  const stopClap = () => { clapRef.current.stop(); setMicOn(false); };

  // Başarısız uyanış: sleeping zaten true olduğu için effect tetiklenmez → clap'i elle yeniden kur (re-wake)
  const rearmWake = () => {
    if (aliveRef.current && cfgRef.current?.enabled && cfgRef.current?.wake_enabled) {
      setSleeping(true);
      startClap();
    }
  };

  // ---- Ses yakalama yardımcıları (MediaRecorder + Whisper) ----

  const getMicStream = async (): Promise<MediaStream> => {
    if (micStreamRef.current) return micStreamRef.current;
    micStreamRef.current = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    return micStreamRef.current;
  };

  const stopMicStream = () => {
    try { micStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    micStreamRef.current = null;
  };

  const startRecorder = async (): Promise<boolean> => {
    try {
      const stream = await getMicStream();
      const mime = window.MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : window.MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size) recChunksRef.current.push(e.data); };
      mr.start(200);
      recRef.current = mr;
      return true;
    } catch { return false; }
  };

  const stopRecorder = (): Promise<Blob | null> => new Promise((resolve) => {
    const mr = recRef.current;
    if (!mr || mr.state === 'inactive') { recRef.current = null; resolve(null); return; }
    mr.onstop = () => {
      recRef.current = null;
      const type = mr.mimeType || 'audio/webm';
      const blob = new Blob(recChunksRef.current, { type });
      recChunksRef.current = [];
      resolve(blob);
    };
    try { mr.stop(); } catch { recRef.current = null; resolve(null); }
  });

  /** Whisper'a gönder → metin. */
  const transcribe = async (blob: Blob): Promise<string> => {
    const fd = new FormData();
    fd.append('audio', blob, 'audio.webm');
    try {
      const r = await fetch(`/api/ai-employee/${tid}/transcribe`, { method: 'POST', body: fd });
      const j = await r.json().catch(() => null);
      return String(j?.text || '').trim();
    } catch { return ''; }
  };

  /**
   * Tek bir kullanıcı konuşmasını kaydeder (VAD):
   * - "konuşma", eşik üstü SÜRDÜRÜLEN ses (≥sustainMs) olarak sayılır → tıklama/gürültü elenir.
   * - birikmiş konuşma < minSpeechMs ise gürültü (speech:false) → transcribe edilmez.
   * - sessizlik (silenceMs) gerçek konuşmadan sonra utterance'ı bitirir (duraklamalar korunur).
   */
  const recordUtterance = (opts: { maxMs?: number; silenceMs?: number; sustainMs?: number; minSpeechMs?: number } = {}): Promise<{ blob: Blob | null; speech: boolean }> => {
    const maxMs = opts.maxMs || VAD.maxMs;
    const silenceMs = opts.silenceMs || VAD.silenceMs;
    const sustainMs = opts.sustainMs || VAD.sustainMs;
    const minSpeechMs = opts.minSpeechMs || VAD.minSpeechMs;
    if (busyRef.current) return Promise.resolve({ blob: null, speech: false });
    busyRef.current = true;
    return new Promise((resolve) => {
      let analyser: AnalyserNode | null = null;
      let ctx: AudioContext | null = null;
      let raf = 0;
      let cleaned = false;
      const isReal = (saw: boolean, total: number) => saw && total >= minSpeechMs;
      const finish = (speech: boolean) => {
        if (cleaned) return;
        cleaned = true;
        busyRef.current = false;
        if (raf) cancelAnimationFrame(raf);
        if (analyser) { try { analyser.disconnect(); } catch {} }
        if (ctx) { try { ctx.close(); } catch {} }
        stopRecorder().then((b) => resolve({ blob: b, speech }));
      };
      (async () => {
        const ok = await startRecorder();
        if (!ok) { finish(false); return; }
        const start = Date.now();
        let totalSpeechMs = 0;
        let segStart = 0;
        let segSince = 0;
        let silenceSince = 0;
        let sawSpeech = false;
        try {
          const stream = await getMicStream();
          const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!AC) { finish(false); return; }
          ctx = new AC();
          const src = ctx.createMediaStreamSource(stream);
          analyser = ctx.createAnalyser();
          analyser.fftSize = 1024;
          src.connect(analyser);
          const data = new Uint8Array(analyser.fftSize);
          const loop = () => {
            if (cleaned) return;
            analyser!.getByteTimeDomainData(data as unknown as Uint8Array<ArrayBuffer>);
            let sum = 0;
            for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
            const rms = Math.sqrt(sum / data.length);
            const now = Date.now();
            if (rms > VAD.speechRms) {
              // sesli bölge
              if (!segStart) { segStart = now; segSince = now; silenceSince = 0; }
              else segSince = now;
            } else {
              // sessiz bölge
              if (segStart) {
                const segDur = segSince - segStart;
                if (segDur >= sustainMs) { totalSpeechMs += segDur; sawSpeech = true; }
                segStart = 0; segSince = 0;
                silenceSince = now;
              } else if (!silenceSince) {
                silenceSince = now;
              }
            }
            // gerçek konuşmadan sonra uzun sessizlik → bitir
            if (silenceSince && sawSpeech && now - silenceSince > silenceMs) {
              if (isReal(sawSpeech, totalSpeechMs)) { finish(true); return; }
            }
            if (now - start > maxMs) { finish(isReal(sawSpeech, totalSpeechMs)); return; }
            raf = requestAnimationFrame(loop);
          };
          loop();
        } catch { finish(false); }
      })();
    });
  };

  // ---- Wake word (alkış → isim) ----

  const onClaps = () => {
    stopClap();
    setWaking(true);
    setHint('Uyanmak için isminizi söyleyin...');
    setWakeDiag('');
    (async () => {
      // Önceki kayıt hâlâ sürüyorsa (yanlış tetikleme) bitmesini bekle, sonra wake kaydı yap
      if (busyRef.current) {
        for (let i = 0; i < 8 && busyRef.current && aliveRef.current; i++) await new Promise((r) => setTimeout(r, 250));
      }
      // Wake: kısa isim için daha duyarlı VAD (sustain 150ms, min 180ms)
      const { blob, speech } = await recordUtterance({ maxMs: 6000, silenceMs: 900, sustainMs: 150, minSpeechMs: 180 });
      if (!aliveRef.current) return;
      if (!blob || !speech) {
        stopMicStream(); // mik kilidini bırak → clap yeniden başlasın
        setWakeDiag('Ses algılanmadı');
        setWaking(false); setHint('');
        rearmWake();
        return;
      }
      const text = await transcribe(blob);
      if (!aliveRef.current) return;
      setWakeDiag(`Tanındı: "${text}"`);
      const name = (cfgRef.current?.name || 'Bilge').toLowerCase();
      const ww = name.replace(/\s+/g, '');
      const norm = text.toLowerCase().replace(/\s+/g, '');
      if (nameMatches(norm, name, ww)) {
        startSession();
      } else {
        stopMicStream(); // mik kilidini bırak → clap yeniden başlasın
        setWaking(false); setHint('');
        rearmWake();
      }
    })();
  };

  const startSession = () => {
    setWaking(false); setSleeping(false); setHint(''); setSessionDiag('');
    sessionOpenRef.current = true;
    bargeCountRef.current = 0;
    rtReconnectRef.current = 0;
    stopMicStream(); // wake kaydının geçici mik akışını bırak
    // Mik/çıkış AudioContext'lerini şimdi ısıt (mobil autoplay/suspended sorununu önler)
    try { unlockAudio(); primeRealtimeAudio(); } catch {}
    startRealtime();
  };

  // Gemini Live oturumu — bağlanamazsa B'ye (Whisper+VAD) düşer
  const startRealtime = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token || !tid) { beginListen(); return; }
    // Bağlanana kadar UI boş kalmasın — gösterge hemen açık
    setListening(true); setMicOn(true); setSessionDiag('Bağlanıyor...');
    const player = createAudioPlayer();
    rtPlayerRef.current = player;
    let setupDone = false;
    const fallbackTimer = setTimeout(() => {
      if (!setupDone && aliveRef.current && sessionOpenRef.current) {
        rtHandleRef.current?.close();
        rtHandleRef.current = null;
        rtPlayerRef.current?.close();
        rtPlayerRef.current = null;
        if (aliveRef.current && sessionOpenRef.current && !processingRef.current) beginListen();
      }
    }, 9000);
    const handle = openRealtime(tid, token, {
      onSetup: () => {
        setupDone = true;
        clearTimeout(fallbackTimer);
        rtActiveRef.current = true;
        rtLastActivityRef.current = Date.now();
        setRtActive(true);
        setListening(true); setMicOn(true);
        setSessionDiag('Hazırlanıyor...');
        setTimeout(() => { if (aliveRef.current) setSessionDiag('Realtime bağlandı'); }, 900);
      },
      onAudio: (b64) => { rtLastActivityRef.current = Date.now(); rtPlayerRef.current?.push(b64); },
      onUserText: (text) => {
        const t = (text || '').trim();
        rtLastActivityRef.current = Date.now();
        if (!t) return;
        setLastText(t);
        setSessionDiag(`Sen: ${t}`);
        rtPlayerRef.current?.stop(); // kullanıcı konuştu → AI sesini kes (barge-in)
        if (SLEEP_PHRASES.test(t)) { stopRealtime(); endSession(); }
      },
      onText: (text) => { rtLastActivityRef.current = Date.now(); if (text) setSessionDiag(`Bilge: ${text}`); },
      onInterrupted: () => { rtPlayerRef.current?.stop(); }, // Gemini kesme sinyali → anında boşalt
      onSleep: () => { stopRealtime(); endSession(); }, // model "sessize geç" → oturumu kapat
      onError: (msg) => {
        if (!setupDone) {
          clearTimeout(fallbackTimer);
          rtHandleRef.current?.close();
          rtHandleRef.current = null;
          if (aliveRef.current && sessionOpenRef.current && !processingRef.current) beginListen();
        } else {
          setSessionDiag(`Hata: ${msg}`);
        }
      },
      onClose: () => {
        clearTimeout(fallbackTimer);
        if (rtActiveRef.current) {
          rtActiveRef.current = false;
          setRtActive(false);
          rtPlayerRef.current?.close();
          rtPlayerRef.current = null;
          // Ani kapanış (1006 vb.) → tek seferlik otomatik yeniden bağlanma; olmazsa Whisper'a düş
          if (aliveRef.current && sessionOpenRef.current && !processingRef.current) {
            if (rtReconnectRef.current < 1 && setupDone) {
              rtReconnectRef.current++;
              setSessionDiag('Bağlantı koptu, yeniden bağlanıyor...');
              setTimeout(() => { if (aliveRef.current && sessionOpenRef.current) startRealtime(); }, 600);
            } else {
              beginListen();
            }
          }
        }
      },
    });
    rtHandleRef.current = handle;

    // Dead-session watchdog: aktifken model 45sn çıktı üretmezse BİR KEZ yeniden bağla (döngü koruması)
    if (rtWatchRef.current) clearInterval(rtWatchRef.current);
    rtWatchRef.current = setInterval(() => {
      if (!rtActiveRef.current || !aliveRef.current || !sessionOpenRef.current) return;
      if (Date.now() - rtLastActivityRef.current > 45000 && rtReconnectRef.current < 1) {
        rtReconnectRef.current++;
        setSessionDiag('Yeniden bağlanıyor...');
        const old = rtHandleRef.current;
        rtHandleRef.current = null;
        old?.close();
        rtPlayerRef.current?.close();
        rtPlayerRef.current = null;
        if (rtActiveRef.current) {
          rtActiveRef.current = false;
          startRealtime();
        }
      }
    }, 5000);
  };

  const stopRealtime = () => {
    if (rtWatchRef.current) { clearInterval(rtWatchRef.current); rtWatchRef.current = null; }
    rtActiveRef.current = false;
    setRtActive(false);
    rtHandleRef.current?.close();
    rtHandleRef.current = null;
    rtPlayerRef.current?.close();
    rtPlayerRef.current = null;
  };

  // Sürekli dinleme: konuşmayı kaydet → Whisper → işle → döngü
  const beginListen = () => {
    if (!aliveRef.current || !sessionOpenRef.current || processingRef.current || busyRef.current) return;
    setListening(true); setMicOn(true);
    (async () => {
      const { blob, speech } = await recordUtterance();
      if (!aliveRef.current || !sessionOpenRef.current) return;
      if (blob && speech) {
        const text = await transcribe(blob);
        if (!aliveRef.current || !sessionOpenRef.current) return;
        const t = (text || '').trim();
        const tNorm = t.replace(/\s+/g, '');
        if (t) {
          // Gürültü ürünü çok kısa metin → yoksay (onay beklenmiyorsa); dinlemeye devam
          if (!lastPending && tNorm.length < 4) {
            setSessionDiag(`Boş/kısa: "${t}"`);
          } else {
            setSessionDiag(`Ses: "${t}"`);
            if (SLEEP_PHRASES.test(t) && !lastPending) { endSession(); return; }
            setLastText(t);
            ask(t);
            return; // ask() bitince dinlemeye döner
          }
        }
      }
      if (aliveRef.current && sessionOpenRef.current && !processingRef.current) {
        restartTimerRef.current = setTimeout(beginListen, 400);
      }
    })();
  };

  const endSession = () => {
    sessionOpenRef.current = false;
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    stopRealtime();
    stopMicStream(); // realtime/B mik akışını bırak → clap yeniden mik alabilsin (yeniden uyandırma)
    setListening(false); setSleeping(true); setMicOn(false); setHint('');
    setLastReply(''); setLastPending(false); setSessionDiag(''); setPttActive(false);
  };

  const ask = async (text: string) => {
    processingRef.current = true;
    setProcessing(true);
    try {
      unlockAudio();
      let rateLimited = false;
      const r = await fetch(`/api/ai-employee/${tid}/conversation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }).then(async (res) => {
        const j = await res.json().catch(() => null);
        if (res.ok) return j;
        rateLimited = true;
        if (res.status === 429) return { reply: 'Patron, çok hızlı soru geldi, birkaç saniye bekleyip tekrar sorun.' };
        return { reply: 'Şu anda yanıtlayamadım, tekrar eder misiniz?' };
      });
      const reply = r?.reply || 'Anlayamadım, tekrar eder misiniz?';
      setLastReply(reply);
      setLastPending(Boolean(r?.pending));
      // Hata/429 durumunda ses çalma (döngüyü kırar, yalnızca metin gösterilir)
      if (!rateLimited) {
        const sp = await speakTts(reply);
        if (sp?.audioUrl) {
          const res = await playWithBargeIn(sp.audioUrl, reply);
          if (res === '__sleep__') { endSession(); return; }
          if (typeof res === 'string') {
            // kullanıcı araya girdi → yeni soruyu hemen işle
            setLastText(res);
            await ask(res);
            return;
          }
        }
      }
    } catch { /* sessiz */ }
    finally {
      processingRef.current = false;
      setProcessing(false);
      // cevap bittikten sonra dinlemeye geri dön
      if (aliveRef.current && sessionOpenRef.current) restartTimerRef.current = setTimeout(beginListen, 300);
    }
  };

  // TTS çağrısı — geçici ElevenLabs hatasında bir kez daha dener
  const speakTts = async (text: string) => {
    for (let i = 0; i < 2; i++) {
      try {
        const r = await fetch(`/api/ai-employee/${tid}/voice/speak`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        }).then((res) => res.json());
        if (r?.audioUrl) return r;
      } catch { /* sonraki deneme */ }
      await new Promise((res) => setTimeout(res, 500));
    }
    return null;
  };

  // Barge-in: cevap sesli okunurken ses enerjisi (VAD) görülürse ANINDA kesilir,
  // ardından kullanıcının söylediği kısa kayıt Whisper ile çözülüp işlenir.
  // Dönüş: true (normal bitti) | '__sleep__' | metin (araya girilen soru)
  const playWithBargeIn = (url: string, expectedReply: string): Promise<boolean | string> => {
    return new Promise((resolve) => {
      stopPlayback();
      unlockAudio();
      let done = false;
      let analyser: AnalyserNode | null = null;
      let ctx: AudioContext | null = null;
      let raf = 0;
      const startTs = Date.now();
      const cleanup = () => {
        if (raf) cancelAnimationFrame(raf);
        if (analyser) { try { analyser.disconnect(); } catch {} }
        if (ctx) { try { ctx.close(); } catch {} }
        analyser = null; ctx = null;
      };
      const captureInterrupt = async (): Promise<string | null> => {
        const { blob, speech } = await recordUtterance({ maxMs: 8000, silenceMs: 1000 });
        if (!blob || !speech) return null;
        const t = await transcribe(blob);
        const normT = t.toLowerCase().replace(/\s+/g, '');
        const normExp = (expectedReply || '').toLowerCase().replace(/\s+/g, '');
        const isEcho = (normExp && normExp.length > 2 && normExp.indexOf(normT) >= 0) || tokenSim(t, expectedReply) > 0.5;
        if (isEcho || !t.trim()) return null;
        return t.trim();
      };
      const startVad = async () => {
        if (done) return;
        try {
          const stream = await getMicStream();
          const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!AC) return;
          ctx = new AC();
          const src = ctx.createMediaStreamSource(stream);
          analyser = ctx.createAnalyser();
          analyser.fftSize = 1024;
          src.connect(analyser);
          const data = new Uint8Array(analyser.fftSize);
          let speakStart = 0;
          const loop = () => {
            if (done) return;
            analyser!.getByteTimeDomainData(data as unknown as Uint8Array<ArrayBuffer>);
            let sum = 0;
            for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
            const rms = Math.sqrt(sum / data.length);
            const now = Date.now();
            if (now - startTs < 600) { raf = requestAnimationFrame(loop); return; }
            if (rms > VAD.bargeRms) {
              if (!speakStart) speakStart = now;
              else if (now - speakStart > VAD.bargeSustainMs) {
                // sürekli konuşma enerjisi → kes
                done = true;
                stopPlayback();
                cleanup();
                if (bargeCountRef.current >= 3) { resolve(true); return; } // döngü koruması
                bargeCountRef.current++;
                captureInterrupt().then((t) => resolve(t === null ? true : (SLEEP_PHRASES.test(t) ? '__sleep__' : t)));
                return;
              }
            } else speakStart = 0;
            raf = requestAnimationFrame(loop);
          };
          loop();
        } catch { /* VAD çalışamadı → normal çal */ }
      };
      playUrl(url).then(() => {
        if (!done) { done = true; cleanup(); resolve(true); }
      });
      setTimeout(() => { if (!done) startVad(); }, 400);
    });
  };

  const ptt = () => {
    if (processing) return;
    if (pttActive) { setPttActive(false); endSession(); return; } // açıkken → kapat
    unlockAudio();
    setPttActive(true);
    startSession(); // PTT: uyanma gerektirmeyen realtime oturum
  };

  const submitTyped = () => {
    const t = typed.trim();
    if (!t || processing) return;
    setTyped('');
    setLastText(t);
    if (rtActiveRef.current) {
      rtHandleRef.current?.sendText(t);
    } else {
      ask(t);
    }
  };

  const showMic = micOn || waking || listening || processing || (!!cfg?.enabled && !!cfg?.wake_enabled && sleeping);
  const showPtt = !!cfg?.push_to_talk_enabled && (pttActive || (!listening && !waking && !processing));

  return (
    <>
      {unsupported ? (
        <div className="fixed bottom-6 right-6 z-40 max-w-xs bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-[11px] text-amber-800 dark:text-amber-200 shadow-lg">
          Sesli konuşma bu tarayıcıda desteklenmiyor (mikrofon/MediaRecorder gerekli).
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
              {sleeping ? '👏 2 alkış + isim' : '🎙️ Mikrofon açık'}
            </div>
          )}
        </>
      )}

      {(waking || listening || processing || lastReply || hint || typed) && (
        <div className="fixed bottom-24 right-6 z-40 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3 space-y-2">
          {waking && <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">{hint}</p>}
          {waking && wakeDiag && <p className="text-[10px] text-red-500 font-mono">{wakeDiag}</p>}
          {listening && <p className="text-[11px] text-red-500 font-semibold">Dinliyorum... (sessize geçmek için "tamam teşekkürler" deyin)</p>}
          {listening && sessionDiag && <p className="text-[10px] text-red-500 font-mono">{sessionDiag}</p>}
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