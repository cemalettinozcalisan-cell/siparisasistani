'use client';

import { useEffect, useRef, useState } from 'react';
import { getTenantId } from '@/lib/tenant';
import { unlockAudio, playUrl } from '@/lib/voice-playback';

/**
 * AI Çalışanım — sesli bildirim istemcisi (panel açıkken).
 * - Kullanıcı jestinde ses kilidini açar.
 * - Bekleyen bildirimleri TTS ile okur.
 * - Bildirimi yalnızca başarıyla çaldıktan sonra acknowledged yapar.
 * - Tüm panel sayfalarında görünür kontrol ve durum bilgisi sunar.
 */
export function AiEmployeeVoice() {
  const tid = getTenantId();
  const playing = useRef(false);
  const enabledRef = useRef(false);
  const checkRef = useRef<() => void>(() => {});
  const [hint, setHint] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [pending, setPending] = useState(0);
  const [checking, setChecking] = useState(false);
  const [statusText, setStatusText] = useState('Kontrol ediliyor...');

  useEffect(() => {
    if (!tid) return;
    let alive = true;

    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    let playSummary = async () => {};
    checkRef.current = () => { void playSummary(); };

    playSummary = async () => {
      if (!enabledRef.current || playing.current) return;
      playing.current = true;
      setChecking(true);
      const lockTimer = setTimeout(() => {
        playing.current = false;
        if (alive) setChecking(false);
      }, 45000);
      try {
        const res = await fetch(`/api/ai-employee/${tid}/voice/pending`).then((r) => r.json());
        if (!alive) return;
        const items = Array.isArray(res?.items) ? res.items : [];
        setPending(items.length);
        if (res?.quiet) {
          setStatusText('Sessiz saat');
          return;
        }
        if (!items.length && !res?.summary) {
          setStatusText('Bekleyen bildirim yok');
          return;
        }

        const itemTexts = items
          .map((it: { voice_text?: string }) => String(it.voice_text || '').trim())
          .filter(Boolean);
        const speechText = itemTexts.length ? itemTexts.join(' ... ') : res.summary;
        const sp = await fetch(`/api/ai-employee/${tid}/voice/speak`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: speechText }),
        }).then((r) => r.json());
        if (!alive) return;
        if (!sp?.audioUrl) {
          setStatusText('Ses üretilemedi');
          setHint(true);
          return;
        }

        const played = await playUrl(String(sp.audioUrl));
        if (played) {
          for (const it of items) {
            fetch(`/api/ai-employee/${tid}/voice/ack`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: it.id }),
            }).catch(() => {});
          }
          setPending(0);
          setStatusText('Bildirim okundu');
          setHint(false);
        } else {
          setHint(true);
          setStatusText('Ses izni gerekli');
        }
      } catch {
        if (alive) setStatusText('Bildirim alınamadı');
      } finally {
        clearTimeout(lockTimer);
        playing.current = false;
        if (alive) setChecking(false);
      }
    };

    const loadConfig = () => {
      fetch(`/api/ai-employee/${tid}`)
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          const on = !!d?.enabled;
          enabledRef.current = on;
          setEnabled(on);
          if (!on) {
            setStatusText('AI Çalışanım kapalı');
            return;
          }
          setStatusText((prev) => (prev === 'Kontrol ediliyor...' ? 'Kontrol ediliyor...' : prev));
          void playSummary();
        })
        .catch(() => {
          if (alive) setStatusText('Yapılandırma alınamadı');
        });
    };

    loadConfig();
    const configIv = setInterval(loadConfig, 30000);

    const onRefresh = () => { if (enabledRef.current) void playSummary(); };
    const onVisibility = () => { if (document.visibilityState === 'visible' && enabledRef.current) void playSummary(); };
    window.addEventListener('data-refresh', onRefresh);
    document.addEventListener('visibilitychange', onVisibility);

    const iv = setInterval(() => { if (enabledRef.current) void playSummary(); }, 15000);
    return () => {
      alive = false;
      clearInterval(iv);
      clearInterval(configIv);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('data-refresh', onRefresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [tid]);

  useEffect(() => {
    if (!tid) return;
    let enabled = false;
    fetch(`/api/ai-employee/${tid}`)
      .then((r) => r.json())
      .then((d) => { if (d) enabled = !!d.enabled; })
      .catch(() => {});
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!enabled) return;
      e.preventDefault();
      e.returnValue = 'Sipariş Asistanı\'nı kapatmak üzeresiniz. AI Çalışanım ile sesli iletişim ve sesli bildirimler duracaktır; siparişleriniz arka planda çalışmaya devam eder.';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [tid]);

  const checkNow = () => {
    unlockAudio();
    setHint(false);
    checkRef.current();
  };

  return (
    <>
      {hint && (
        <div className="fixed bottom-20 left-4 z-50 max-w-xs bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 shadow-lg text-xs text-indigo-800 dark:text-indigo-200">
          Sesli bildirimler için tarayıcının sese izin vermesi gerekiyor. Lütfen sayfada bir yere tıklayın — yeni bildirimler otomatik okunacaktır.
          <button onClick={() => setHint(false)} className="ml-2 font-bold hover:underline">Kapat</button>
        </div>
      )}
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={checkNow}
          disabled={enabled !== true || checking}
          title="Bekleyen sesli bildirimleri kontrol et"
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold shadow-md transition-all ${
            enabled === false
              ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              : pending > 0
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
          }`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-70 ${checking ? 'animate-ping bg-current' : 'bg-current'}`} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
          </span>
          <span>Sesli bildirim: {statusText}</span>
          {pending > 0 && <span className="rounded-full bg-current/15 px-1.5 py-0.5">{pending}</span>}
        </button>
      </div>
    </>
  );
}
