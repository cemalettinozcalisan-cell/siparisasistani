'use client';

/**
 * AI Çalışanım — yerel alkış algılama (Web Audio API, cihazda).
 * 2 keskin ses patlaması (alkış) yaklaşık 700ms içinde algılanır.
 * Ham ses buluta gitmez; yalnızca cihazda enerji analizi yapılır.
 */

export interface ClapDetector {
  start: () => Promise<boolean>;
  stop: () => void;
  setCallback: (cb: () => void) => void;
  isRunning: () => boolean;
}

export function createClapDetector(): ClapDetector {
  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let stream: MediaStream | null = null;
  let raf = 0;
  let cb: (() => void) | null = null;
  const onsets: number[] = [];
  let lastRms = 0;
  let quietUntil = 0;

  const THRESHOLD = 0.18; // alkış RMS eşiği
  const CLAP_WINDOW_MS = 700; // 2 alkış penceresi
  const QUIET_MS = 180; // iki alkış arası sessizlik beklentisi

  const start = async () => {
    if (ctx) return true;
    try {
      const AC: typeof AudioContext | undefined =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const src = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      const loop = () => {
        if (!analyser) return;
        analyser.getByteTimeDomainData(data as unknown as Uint8Array<ArrayBuffer>);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const now = Date.now();
        if (rms > THRESHOLD && rms > lastRms * 1.4 && now >= quietUntil) {
          onsets.push(now);
          // pencere içinde kalan alkışları tut
          const filtered = onsets.filter((t) => now - t < CLAP_WINDOW_MS);
          onsets.length = 0;
          onsets.push(...filtered);
          if (onsets.length >= 2) {
            onsets.length = 0;
            quietUntil = now + 1200;
            cb?.();
          }
        }
        lastRms = rms;
        raf = requestAnimationFrame(loop);
      };
      loop();
      return true;
    } catch {
      stop();
      return false;
    }
  };

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    analyser = null;
    if (ctx) ctx.close().catch(() => {});
    ctx = null;
    onsets.length = 0;
  };

  return {
    start,
    stop,
    setCallback: (f) => { cb = f; },
    isRunning: () => !!ctx,
  };
}