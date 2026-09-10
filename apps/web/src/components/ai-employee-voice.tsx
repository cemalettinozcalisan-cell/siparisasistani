'use client';

import { useEffect, useRef } from 'react';
import { getTenantId } from '@/lib/tenant';

/**
 * AI Çalışanım — sesli bildirim istemcisi (panel açıkken).
 * - Bekleyen sesli bildirimleri toplar, özeti TTS ile hoparlörden çalar.
 * - Çaldıktan sonra acknowledged yapar (tekrar seslendirilmez).
 * - Panel kapatılırken uyarı gösterir (AI aktifse).
 */
export function AiEmployeeVoice() {
  const tid = getTenantId();
  const playing = useRef(false);

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
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            audio.play().catch(() => resolve());
          });
        }
        for (const it of (res.items || [])) {
          fetch(`/api/ai-employee/${tid}/voice/ack`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: it.id }),
          }).catch(() => {});
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

  return null;
}