'use client';

/**
 * AI Çalışanım — Gemini Live realtime istemcisi.
 * Tarayıcı → /api/ai-employee/realtime (WS) → backend proxy → Gemini 3.8 Live.
 * - Mik: AudioContext(sampleRate:16000) + ScriptProcessor → Int16 PCM → base64 → WS.
 * - Hoparlör: 24kHz PCM → AudioBuffer kuyruğuyla çalar; barge-in'de kesilir.
 *
 * Sağlamlaştırma (mobil):
 * - AudioContext'ler KALICI + bir kez açılır; stop() context'i KAPATMAZ (mobil autoplay/suspended + context limiti sorunları).
 * - İlk kullanıcı jestinde (pointer/key/touch) her iki context resume edilir.
 * - getUserMedia 3 deneme (1sn arayla); close() sonrası geç gelen stream durdurulur.
 */

export interface RealtimeEvents {
  onSetup?: () => void;
  onAudio?: (base64Pcm: string, mimeType: string) => void;
  onText?: (text: string) => void;
  onUserText?: (text: string) => void;
  onInterrupted?: () => void;
  onSleep?: () => void;
  onUserSpeech?: () => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

export interface RealtimeHandle {
  sendText: (text: string) => void;
  sendTurnComplete: () => void;
  close: () => void;
  captureRms: () => number;
}

function wsBase(): string {
  // Tünel (cloudflared/ngrok) testi için env ile override edilebilir; tanımsızsa mevcut davranış korunur
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_WS_URL) return process.env.NEXT_PUBLIC_API_WS_URL;
  if (typeof window === 'undefined') return 'ws://localhost:3001';
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.hostname}:3001`;
}

// --- Kalıcı (persistent) AudioContext'ler — bir kez oluşur, asla kapatılmaz ---
let captureCtx: AudioContext | null = null;
let playerCtx: AudioContext | null = null;
let gestureBound = false;

function ac(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

function resumeAll() {
  for (const c of [captureCtx, playerCtx]) {
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }
}

function bindGestureResume() {
  if (gestureBound || typeof window === 'undefined') return;
  gestureBound = true;
  window.addEventListener('pointerdown', resumeAll);
  window.addEventListener('keydown', resumeAll);
  window.addEventListener('touchstart', resumeAll, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') resumeAll(); });
}

function getCtx(kind: 'capture' | 'player', sampleRate: number): AudioContext | null {
  const Ctor = ac();
  if (!Ctor) return null;
  bindGestureResume();
  let ctx = kind === 'capture' ? captureCtx : playerCtx;
  if (!ctx) {
    try {
      ctx = new Ctor({ sampleRate });
    } catch {
      try { ctx = new Ctor(); } catch { return null; }
    }
    if (kind === 'capture') captureCtx = ctx; else playerCtx = ctx;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Kullanıcı jestinde (veya oturum başında) her iki context'i ısıt/aç. */
export function primeRealtimeAudio() {
  getCtx('capture', 16000);
  getCtx('player', 24000);
}

export function openRealtime(tid: string, token: string, events: RealtimeEvents): RealtimeHandle {
  const ws = new WebSocket(`${wsBase()}/api/ai-employee/realtime?tid=${encodeURIComponent(tid)}&token=${encodeURIComponent(token)}`);
  const state = { closed: false };

  let micStream: MediaStream | null = null;
  let proc: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let cleanupResume: (() => void) | null = null;
  let lastRms = 0;
  let lastAudioAt = 0;
  let droppedFrames = 0;
  let lastRtt = 0;
  const wasSpeech = { current: false };

  ws.onopen = () => {};
  ws.onmessage = (ev) => {
    try {
      const m = JSON.parse(ev.data as string);
      if (m.type === 'setup') { void startCapture().then((ok) => { if (ok) events.onSetup?.(); }); }
      else if (m.type === 'audio') {
        const now = Date.now();
        if (lastAudioAt && now - lastAudioAt > 1500) sendJson({ type: 'gap', ms: now - lastAudioAt });
        lastAudioAt = now;
        events.onAudio?.(m.data as string, m.mimeType || 'audio/pcm');
      }
      else if (m.type === 'pong') { lastRtt = Date.now() - Number(m.t || 0); }
      else if (m.type === 'turn_end') { lastAudioAt = 0; } // tur sonu → sonraki paket gap sayılmasın
      else if (m.type === 'text') events.onText?.(m.text as string);
      else if (m.type === 'user_text') events.onUserText?.(m.text as string);
      else if (m.type === 'interrupted') events.onInterrupted?.();
      else if (m.type === 'sleep') events.onSleep?.();
      else if (m.type === 'error') events.onError?.(m.message as string);
    } catch { /* bozuk mesaj */ }
  };
  ws.onerror = () => events.onError?.('Bağlantı hatası');
  ws.onclose = () => { if (!state.closed) events.onClose?.(); };

  const sendJson = (obj: unknown) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); };

  // Teşhis: RTT probu (5sn) + tanı raporu (10sn) — tünel gecikmesi/backlog görünür olsun
  const pingTimer = window.setInterval(() => sendJson({ type: 'ping', t: Date.now() }), 5000);
  const diagTimer = window.setInterval(() => sendJson({ type: 'diag', buffered: ws.bufferedAmount, dropped: droppedFrames, rtt: lastRtt }), 10000);

  const releaseCapture = () => {
    try { proc?.disconnect(); } catch {}
    proc = null;
    try { source?.disconnect(); } catch {}
    source = null;
    try { micStream?.getTracks().forEach((t) => t.stop()); } catch {}
    micStream = null;
    try { cleanupResume?.(); } catch {}
    cleanupResume = null;
  };

  const startCapture = async (): Promise<boolean> => {
    if (state.closed) return false;
    // getUserMedia: geçici hata (mik meşgul) → 3 deneme
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (state.closed) { s.getTracks().forEach((t) => t.stop()); return false; }
        micStream = s;
        break;
      } catch (e) {
        if (state.closed) return false;
        console.log(`[rt] getUserMedia deneme ${attempt + 1}/3 hata:`, (e as Error).message);
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
        else { events.onError?.('Mikrofon açılamadı'); return false; }
      }
    }
    if (state.closed || !micStream) { releaseCapture(); return false; }

    const c = getCtx('capture', 16000);
    if (!c) { releaseCapture(); events.onError?.('Ses bağlamı açılamadı'); return false; }
    // Askıda kalırsa periyodik resume + jeste cevap
    const resumeIfNeeded = () => { if (captureCtx && captureCtx.state === 'suspended') captureCtx.resume().catch(() => {}); };
    resumeIfNeeded();
    const timer = window.setInterval(resumeIfNeeded, 1500);
    window.addEventListener('pointerdown', resumeIfNeeded);
    window.addEventListener('keydown', resumeIfNeeded);
    cleanupResume = () => {
      window.clearInterval(timer);
      window.removeEventListener('pointerdown', resumeIfNeeded);
      window.removeEventListener('keydown', resumeIfNeeded);
    };
    try {
      source = c.createMediaStreamSource(micStream);
      proc = c.createScriptProcessor(4096, 1, 1);
      proc.onaudioprocess = (e) => {
        if (state.closed) return;
        // Backlog koruması: gönderim kuyruğu tıkanmışsa ses paketini at (gecikmiş ses modeli bozar)
        if (ws.bufferedAmount > 262144) { droppedFrames++; return; }
        const ch = e.inputBuffer.getChannelData(0);
        let sum = 0;
        const int16 = new Int16Array(ch.length);
        for (let i = 0; i < ch.length; i++) {
          const v = Math.max(-1, Math.min(1, ch[i]));
          sum += v * v;
          int16[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
        }
        lastRms = Math.sqrt(sum / ch.length);
        // Yerel VAD: kullanıcı konuşmaya BAŞLAYINCA tetikle (barge-in, Gemini'yi beklemeden)
        if (lastRms > 0.06 && !wasSpeech.current) {
          wasSpeech.current = true;
          events.onUserSpeech?.();
        } else if (lastRms <= 0.03) {
          wasSpeech.current = false;
        }
        const bytes = new Uint8Array(int16.buffer);
        let bin = '';
        const STEP = 0x8000;
        for (let i = 0; i < bytes.length; i += STEP) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + STEP)));
        sendJson({ type: 'audio', data: btoa(bin) });
      };
      source.connect(proc);
      proc.connect(c.destination);
      return true;
    } catch {
      releaseCapture();
      events.onError?.('Mikrofon bağlanamadı');
      return false;
    }
  };

  return {
    sendText: (text) => sendJson({ type: 'text', text }),
    sendTurnComplete: () => sendJson({ type: 'turn_complete' }),
    captureRms: () => lastRms,
    close: () => {
      state.closed = true;
      try { window.clearInterval(pingTimer); window.clearInterval(diagTimer); } catch {}
      releaseCapture();
      // Not: captureCtx KAPATILMAZ — kalıcı kalır, reconnect'te yeniden kullanılır (mobil suspended sorunu önlenir)
      try { ws.close(1000, 'client-close'); } catch { try { ws.close(); } catch {} }
    },
  };
}

/** Gemini PCM (24kHz) oynatıcı — kuyruklu, barge-in'de kesilir. Context KALICI. */
export interface AudioPlayer {
  push: (base64Pcm: string) => void;
  stop: () => void;
  close: () => void;
}

export function createAudioPlayer(): AudioPlayer {
  let queue: AudioBuffer[] = [];
  let playing = false;
  let activeSrc: AudioBufferSourceNode | null = null;

  const playNext = () => {
    if (playing) return;
    const c = getCtx('player', 24000);
    if (!c) return;
    const buf = queue.shift();
    if (!buf) { playing = false; return; }
    playing = true;
    try {
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      activeSrc = src;
      src.onended = () => { if (activeSrc === src) activeSrc = null; playing = false; playNext(); };
      src.start();
    } catch { playing = false; playNext(); }
  };

  return {
    push: (base64Pcm) => {
      try {
        const c = getCtx('player', 24000);
        if (!c) return;
        const bin = atob(base64Pcm);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const int16 = new Int16Array(bytes.buffer);
        const buf = c.createBuffer(1, int16.length, c.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < int16.length; i++) data[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
        queue.push(buf);
        playNext();
      } catch { /* oynatılamadı */ }
    },
    stop: () => {
      // Context'i KAPATMA — yalnızca aktif sesi kes ve kuyruğu boşalt (barge-in)
      try { activeSrc?.stop(); activeSrc?.disconnect(); } catch {}
      activeSrc = null;
      queue = [];
      playing = false;
    },
    close: () => {
      try { activeSrc?.stop(); activeSrc?.disconnect(); } catch {}
      activeSrc = null;
      queue = [];
      playing = false;
      // Not: playerCtx KAPATILMAZ — kalıcı kalır
    },
  };
}
