'use client';

/**
 * Sipariş AI — Gemini Live realtime istemcisi (İZOLE).
 * Tarayıcı → /api/order-ai/realtime (WS) → Gemini Live.
 * Oynatıcı/bağlam, gemini-realtime'dan yeniden kullanılır (paylaşılan, değiştirilmez).
 */

import { createAudioPlayer, primeRealtimeAudio, type AudioPlayer } from './gemini-realtime';

export interface OrderRealtimeEvents {
  onSetup?: () => void;
  onAudio?: (base64Pcm: string, mimeType: string) => void;
  onText?: (text: string) => void;
  onUserText?: (text: string) => void;
  onInterrupted?: () => void;
  onOrder?: (info: { orderNumber?: string; orderId?: string; total?: number; status?: string }) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

export interface OrderRealtimeHandle {
  sendText: (text: string) => void;
  close: () => void;
  captureRms: () => number;
}

function wsBase(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_WS_URL) return process.env.NEXT_PUBLIC_API_WS_URL;
  if (typeof window === 'undefined') return 'ws://localhost:3001';
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.hostname}:3001`;
}

export function openOrderRealtime(tid: string, token: string, events: OrderRealtimeEvents, opts: { voice?: string; phone?: string; ab?: string } = {}): OrderRealtimeHandle {
  primeRealtimeAudio();
  const qs = new URLSearchParams({ tid, token });
  if (opts.voice) qs.set('voice', opts.voice);
  if (opts.phone) qs.set('phone', opts.phone);
  if (opts.ab) qs.set('ab', opts.ab);
  const ws = new WebSocket(`${wsBase()}/api/order-ai/realtime?${qs.toString()}`);
  const state = { closed: false };
  const player: AudioPlayer = createAudioPlayer();

  let micStream: MediaStream | null = null;
  let proc: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let lastRms = 0;

  const sendJson = (obj: unknown) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); };

  const releaseCapture = () => {
    try { proc?.disconnect(); } catch {}
    proc = null;
    try { source?.disconnect(); } catch {}
    source = null;
    try { micStream?.getTracks().forEach((t) => t.stop()); } catch {}
    micStream = null;
  };

  ws.onmessage = (ev) => {
    try {
      const m = JSON.parse(ev.data as string);
      if (m.type === 'setup') { void startCapture().then((ok) => { if (ok) events.onSetup?.(); }); }
      else if (m.type === 'audio') { player.push(m.data as string); events.onAudio?.(m.data as string, m.mimeType || 'audio/pcm'); }
      else if (m.type === 'text') events.onText?.(m.text as string);
      else if (m.type === 'user_text') events.onUserText?.(m.text as string);
      else if (m.type === 'interrupted') { player.stop(); events.onInterrupted?.(); }
      else if (m.type === 'order') events.onOrder?.(m);
      else if (m.type === 'error') events.onError?.(m.message as string);
    } catch { /* bozuk mesaj */ }
  };
  ws.onerror = () => events.onError?.('Bağlantı hatası');
  ws.onclose = () => { if (!state.closed) events.onClose?.(); };

  const startCapture = async (): Promise<boolean> => {
    if (state.closed) return false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        if (state.closed) { s.getTracks().forEach((t) => t.stop()); return false; }
        micStream = s;
        break;
      } catch (e) {
        if (state.closed) return false;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 800));
        else { events.onError?.('Mikrofon açılamadı'); return false; }
      }
    }
    if (state.closed || !micStream) { releaseCapture(); return false; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) { releaseCapture(); events.onError?.('Ses bağlamı yok'); return false; }
    const ctx = new AC({ sampleRate: 16000 });
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    try {
      source = ctx.createMediaStreamSource(micStream);
      proc = ctx.createScriptProcessor(4096, 1, 1);
      proc.onaudioprocess = (e) => {
        if (state.closed) return;
        if (ws.bufferedAmount > 262144) return; // backlog koruması
        const ch = e.inputBuffer.getChannelData(0);
        let sum = 0;
        const int16 = new Int16Array(ch.length);
        for (let i = 0; i < ch.length; i++) { const v = Math.max(-1, Math.min(1, ch[i])); sum += v * v; int16[i] = v < 0 ? v * 0x8000 : v * 0x7fff; }
        lastRms = Math.sqrt(sum / ch.length);
        const bytes = new Uint8Array(int16.buffer);
        let bin = '';
        const STEP = 0x8000;
        for (let i = 0; i < bytes.length; i += STEP) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + STEP)));
        sendJson({ type: 'audio', data: btoa(bin) });
      };
      source.connect(proc);
      proc.connect(ctx.destination);
      return true;
    } catch { releaseCapture(); events.onError?.('Mikrofon bağlanamadı'); return false; }
  };

  return {
    sendText: (text) => sendJson({ type: 'text', text }),
    captureRms: () => lastRms,
    close: () => {
      state.closed = true;
      releaseCapture();
      try { player.close(); } catch {}
      try { ws.close(1000, 'client-close'); } catch { try { ws.close(); } catch {} }
    },
  };
}
