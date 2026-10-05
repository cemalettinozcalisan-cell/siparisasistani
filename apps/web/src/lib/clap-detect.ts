'use client';

/**
 * AI Çalışanım — yerel alkış algılama (Web Audio API, cihazda).
 * 2 keskin ses patlaması (alkış) yaklaşık 700ms içinde algılanır.
 * Ham ses buluta gitmez; yalnızca cihazda enerji analizi yapılır.
 *
 * Sağlamlaştırma:
 * - Race guard: durdurulduysa geç gelen getUserMedia sonucu yoksayılır.
 * - Jestle resume: tıklama/klavye ile AudioContext'i aç (otomatik-oynatma askıya alınması).
 * - Retry: getUserMedia geçici hata verirse 800ms sonra bir kez daha dener.
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
  let source: MediaStreamAudioSourceNode | null = null;
  let stream: MediaStream | null = null;
  let raf = 0;
  let cb: (() => void) | null = null;
  let started = false; // race guard: en son start bayrağı
  let wantRunning = false; // uygulama detektörü istiyor mu — self-heal restart bunu korur
  let listenersOn = false;
  const onsets: number[] = [];
  let quietUntil = 0;

  const THRESHOLD = 0.05; // alkış RMS eşiği (daha zayıf alkışları da yakalar)
  const CLAP_WINDOW_MS = 700;
  const QUIET_MS = 180;

  const resumeOnGesture = () => {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  };
  const onVisibility = () => { if (document.visibilityState === 'visible') resumeOnGesture(); };
  const addGestureListeners = () => {
    if (listenersOn || typeof window === 'undefined') return;
    listenersOn = true;
    window.addEventListener('pointerdown', resumeOnGesture);
    window.addEventListener('keydown', resumeOnGesture);
    window.addEventListener('pointermove', resumeOnGesture);
    document.addEventListener('visibilitychange', onVisibility);
  };
  const removeGestureListeners = () => {
    if (!listenersOn || typeof window === 'undefined') return;
    listenersOn = false;
    window.removeEventListener('pointerdown', resumeOnGesture);
    window.removeEventListener('keydown', resumeOnGesture);
    window.removeEventListener('pointermove', resumeOnGesture);
    document.removeEventListener('visibilitychange', onVisibility);
  };

  const start = async (): Promise<boolean> => {
    // Yalnızca TAM kurulu ise erken dön (ctx kalıcı olabilir ama stream/analyser düşmüş olabilir → re-wake)
    if (ctx && stream && analyser) return true;
    started = true;
    wantRunning = true;
    addGestureListeners();
    try {
      const AC: typeof AudioContext | undefined =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) { console.log('[clap] AudioContext desteklenmiyor'); return false; }

      // Önce mik iznini al (kullanıcı aktivasyonu) → ardından AudioContext oluştur → context çalışsın (otomatik-oynatma askısı önlenir)
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          break;
        } catch (e) {
          console.log(`[clap] getUserMedia deneme ${attempt + 1}/3 hata:`, (e as Error).message);
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000));
            if (!started) return false; // eski start iptal
          } else {
            stop();
            return false;
          }
        }
      }
      if (!started || !stream) { stop(); return false; }

      if (!ctx || ctx.state === 'closed') ctx = new AC(); // kalıcı: bir kez oluştur (kapalıysa yeniden), kapatma
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      // Askıda kalırsa periyodik resume; uzun süre askıdaysa tek sefer self-heal (stop+start)
      let suspendedSince = 0;
      let healed = false;
      const ensureRunning = () => {
        if (!ctx) return;
        if (ctx.state === 'suspended') {
          if (!suspendedSince) suspendedSince = Date.now();
          ctx.resume().then(() => { if (ctx?.state === 'running') console.log('[clap] ctx çalışıyor'); }).catch(() => {});
          if (Date.now() - suspendedSince > 6000 && !healed) {
            healed = true;
            console.log('[clap] uzun süre askıda — self-heal restart');
            teardown();
            setTimeout(() => { if (wantRunning) void start(); }, 300);
            return;
          }
        } else {
          suspendedSince = 0;
        }
        if (wantRunning) setTimeout(ensureRunning, 1500);
      };
      ensureRunning();
      console.log('[clap] ctx state:', ctx.state);

      source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      let baseRms = 0;
      let frame = 0;
      let lastDiag = 0;
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
        if (now - lastDiag > 3000) {
          lastDiag = now;
          console.log(`[clap] rms=${rms.toFixed(3)} state=${ctx?.state}`);
        }
        frame++;
        baseRms = baseRms === 0 ? rms : baseRms * 0.9 + rms * 0.1;
        if (frame < 120) { raf = requestAnimationFrame(loop); return; } // ısınma ~2sn — sayfa açılışında yanlış tetiklenmeyi önler
        if (rms > THRESHOLD && rms > baseRms * 1.4 && now >= quietUntil) {
          onsets.push(now);
          const filtered = onsets.filter((t) => now - t < CLAP_WINDOW_MS);
          onsets.length = 0;
          onsets.push(...filtered);
          if (onsets.length >= 2) {
            onsets.length = 0;
            quietUntil = now + 1200;
            cb?.();
          }
        }
        raf = requestAnimationFrame(loop);
      };
      loop();
      console.log('[clap] başlatıldı, mik hazır');
      return true;
    } catch (e) {
      console.log('[clap] start HATA:', (e as Error).message);
      stop();
      return false;
    }
  };

  const teardown = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    try { source?.disconnect(); } catch {}
    source = null;
    try { analyser?.disconnect(); } catch {}
    analyser = null;
    onsets.length = 0;
    // Not: ctx KAPATILMAZ — kalıcı kalır (mobil suspended sorununu önler)
  };

  const stop = () => {
    started = false;
    wantRunning = false;
    removeGestureListeners();
    teardown();
  };

  return {
    start,
    stop,
    setCallback: (f) => { cb = f; },
    isRunning: () => !!ctx,
  };
}