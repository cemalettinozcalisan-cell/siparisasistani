'use client';

/**
 * AI Çalışanım ses oynatma — tarayıcı otomatik oynatma engelini aşar.
 * Web Audio API kullanır; AudioContext, kullanıcı jestiyle (tıklama/klavye) açılır.
 * Gerekirse <audio> elementine düşer.
 */

let ctx: AudioContext | null = null;
let activeSrc: AudioBufferSourceNode | null = null;
let activeAudio: HTMLAudioElement | null = null;

/** Kullanıcı jesti içinde çağır → AudioContext'i açar (autoplay izni). */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch {
    /* sessiz */
  }
}

/** Çalan sesi durdur (barge-in). */
export function stopPlayback() {
  try {
    if (activeSrc) {
      activeSrc.stop();
      activeSrc.disconnect();
    }
  } catch {
    /* sessiz */
  }
  activeSrc = null;
  try {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.src = '';
    }
  } catch {
    /* sessiz */
  }
  activeAudio = null;
  resolvePlayback(true);
}

let playbackResolve: ((v: boolean) => void) | null = null;
function resolvePlayback(v: boolean) {
  if (playbackResolve) { const r = playbackResolve; playbackResolve = null; r(v); }
}

/** URL'deki sesi çalar. Başarı = true. */
export async function playUrl(url: string): Promise<boolean> {
  // 1) Web Audio (autoplay-safe, click ile unlocked)
  if (ctx) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(buf);
        const src = ctx.createBufferSource();
        src.buffer = audioBuf;
        src.connect(ctx.destination);
        activeSrc = src;
        src.onended = () => { if (activeSrc === src) activeSrc = null; resolvePlayback(true); };
        src.start(0);
        return new Promise<boolean>((resolve) => { playbackResolve = resolve; });
      }
    } catch {
      /* audio elementine düş */
    }
  }
  // 2) Fallback: <audio>
  try {
    const a = new Audio(url);
    activeAudio = a;
    await a.play();
    return true;
  } catch {
    return false;
  }
}