'use client';

import { useEffect } from 'react';
import { getTenantId } from '@/lib/tenant';

/**
 * Panel geneli anlık veri aboneliği (SSE).
 * API /api/events/stream -> 'refresh' olayları -> `data-refresh` CustomEvent'i.
 * Sayfalar bu olayı dinleyip kendini yeniler.
 */
export function RealtimeEventsProvider() {
  useEffect(() => {
    let es: EventSource | null = null;
    let closed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) { retryTimer = setTimeout(connect, 3000); return; }
      const tid = getTenantId();
      try {
        es = new EventSource(`/api/events/stream?tenantId=${encodeURIComponent(tid)}&token=${encodeURIComponent(token)}`);
        es.addEventListener('refresh', (ev: Event) => {
          try {
            const m = JSON.parse(String((ev as MessageEvent).data));
            if (m?.eventType) window.dispatchEvent(new CustomEvent('data-refresh', { detail: m }));
          } catch { /* yoksay */ }
        });
        es.onerror = () => {
          // EventSource otomatik yeniden bağlanır; kapandıysa token tazelenip tekrar kurulur
          if (es && es.readyState === EventSource.CLOSED) {
            try { es.close(); } catch { /* yoksay */ }
            es = null;
            retryTimer = setTimeout(connect, 5000);
          }
        };
      } catch {
        retryTimer = setTimeout(connect, 5000);
      }
    };

    connect();
    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      try { es?.close(); } catch { /* yoksay */ }
    };
  }, []);

  return null;
}
