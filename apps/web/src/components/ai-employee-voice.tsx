'use client';

import { useEffect, useRef, useState } from 'react';
import { getTenantId } from '@/lib/tenant';

/**
 * AI Çalışanım — sesli bildirim istemcisi (panel açıkken).
 * - Bekleyen sesli bildirimleri toplar, özeti TTS ile hoparlörden çalar.
 * - Yalnızca başarıyla çalınca acknowledged yapar (tekrar seslendirilmez).
 * - Tarayıcı otomatik oynatmayı engellerse ipucu gösterir, bildirim kaybolmaz (sonraki turda tekrar denenir).
 */
export function AiEmployeeVoice() {
  const tid = getTenantId();
  const playing = useRef(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    if (!tid) return;
    let alive = true;
    let enabled = false;

    fetch(`/api/ai-employee/${tid}`)
      .then((r) => r.json())
      .then((d) => { if (d) enabled = !!d.enabled; })
      .catch(() => {});

    const playSummary = async () => {
      if (!enabled || playing.current) return;
      playing.current = true;
      try {
        const res = await fetch(`/api/ai-employee/${tid}/voice/pending`).then((r) => r.json());
        if (!alive) return;
        if (res?.quiet || !res?.summary) { playing.current = false; return; }

        const sp = await fetch(`/api/ai-employee/${tid}/voice/speak`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: res.summary }),
        }).then((r) => r.json());
        if (sp?.audioUrl) {
          const audio = new Audio(sp.audioUrl);
          const played = await new Promise<boolean>((resolve) => {
            audio.onended = () => resolve(true);
            audio.onerror = () => resolve(false);
            audio.play()
              .then(() => { /* oynuyor */ })
              .catch(() => resolve(false));
          });
          if (played) {
            // Başarıyla çalındı → acknowledged (tekrar seslendirilmez)
            for (const it of (res.items || [])) {
              fetch(`/api/ai-employee/${tid}/voice/ack`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: it.id }),
              }).catch(() => {});
            }
          } else {
            // Autoplay engellendi → bildirim bekler, kullanıcıya ipucu
            setHint(true);
          }
        }
      } catch { /* sessiz */ }
      playing.current = false;
    };

    playSummary();
    const iv = setInterval(playSummary, 15000);
    return () => { alive = false; clearInterval(iv); };
  }, [tid]);

  // Panel kapatma uyarısı (AI aktifken)
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

  if (!hint) return null;
  return (
    <div className="fixed bottom-20 left-4 z-50 max-w-xs bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 shadow-lg text-xs text-indigo-800 dark:text-indigo-200">
      Sesli bildirimler için tarayıcının sese izin vermesi gerekiyor. Lütfen sayfada bir yere tıklayın — yeni bildirimler otomatik okunacaktır.
      <button onClick={() => setHint(false)} className="ml-2 font-bold hover:underline">Kapat</button>
    </div>
  );
}