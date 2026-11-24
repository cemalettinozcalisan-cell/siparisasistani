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

export async function playUrlAndWait(url: string): Promise<boolean> {
  stopPlayback();
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const audio = new Audio(url);
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (activeAudio === audio) activeAudio = null;
      if (playbackResolve === finish) playbackResolve = null;
      resolve(ok);
    };
    audio.preload = 'auto';
    audio.volume = 1;
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    activeAudio = audio;
    playbackResolve = finish;
    audio.play().catch(() => finish(false));
  });
}

/** URL'deki sesi çalar. Başarı = true. */
export async function playUrl(url: string): Promise<boolean> {
  // 1) <audio> — kullanıcı jestinden sonra en güvenilir oynatma yolu
  try {
    const a = new Audio(url);
    a.preload = 'auto';
    a.volume = 1;
    activeAudio = a;
    await a.play();
    return true;
  } catch {
    /* Web Audio'ya düş */
  }
  // 2) Fallback: Web Audio
  if (ctx) {
    try {
      if (ctx.state !== 'running') await ctx.resume();
      if (ctx.state === 'running') {
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
      }
    } catch {
      /* sessiz */
    }
  }
  return false;
}