'use client';

/**
 * Sipariş AI — sesli test ekranı.
 * - Canlı (Realtime): Gemini Live (/api/order-ai/realtime) — birincil.
 * - Bas-Konuş (Yedek): Whisper STT → /api/conversation → ElevenLabs TTS — realtime düşerse.
 */

import { useRef, useState } from 'react';
import { getTenantId } from '@/lib/tenant';
import { unlockAudio, playUrl } from '@/lib/voice-playback';
import { openOrderRealtime, type OrderRealtimeHandle } from '@/lib/order-ai-realtime';

interface Msg { role: 'user' | 'assistant'; content: string }
interface Meta { intent?: string; confidence?: number; orderCreated?: boolean; orderNumber?: string; sessionId?: string; needsHuman?: boolean }

function authHeaders(json = true): Record<string, string> {
  try {
    const token = localStorage.getItem('auth_token');
    const h: Record<string, string> = {};
    if (json) h['Content-Type'] = 'application/json';
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  } catch { return json ? { 'Content-Type': 'application/json' } : {}; }
}

export default function OrderAiPage() {
  const tenantId = getTenantId();
  const [phone, setPhone] = useState('05551112233');
  const [voice, setVoice] = useState('Aoede');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<Meta>({});
  const [liveAiText, setLiveAiText] = useState('');
  const [rtActive, setRtActive] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const busyRef = useRef(false);

  const rtRef = useRef<OrderRealtimeHandle | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // ---------- CANLI (REALTIME) ----------
  const startRealtime = () => {
    if (!tenantId) { setError('tenant yok'); return; }
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) { setError('Önce giriş yapın.'); return; }
    unlockAudio();
    setError(''); setFallbackMode(false); setLiveAiText('');
    setStatus('🔌 Canlı bağlanıyor...');
    let setupDone = false;
    const handle = openOrderRealtime(tenantId, token, {
      onSetup: () => { setupDone = true; setRtActive(true); setStatus('🟢 Canlı dinliyor...'); },
      onUserText: (t) => { if (t?.trim()) { setMessages((p) => [...p, { role: 'user', content: t }]); setStatus('🎧 Dinliyorum...'); } },
      onText: (t) => { if (t) setLiveAiText((p) => (p + ' ' + t).slice(-400)); },
      onOrder: (o) => { setMeta((m) => ({ ...m, orderCreated: true, orderNumber: o.orderNumber })); setStatus(`✅ Sipariş: #${o.orderNumber}`); },
      onInterrupted: () => setLiveAiText(''),
      onError: (msg) => {
        if (!setupDone) { try { handle.close(); } catch {} rtRef.current = null; setRtActive(false); setFallbackMode(true); setError('Canlı bağlanamadı — Bas-Konuş (Yedek) kullanın. (' + msg + ')'); setStatus(''); }
        else setStatus('Hata: ' + msg);
      },
      onClose: () => { if (rtRef.current) { rtRef.current = null; setRtActive(false); setFallbackMode(true); setStatus('Canlı kapandı — Bas-Konuş (Yedek) kullanın.'); } },
    }, { voice });
    rtRef.current = handle;
  };

  const stopRealtime = () => {
    const h = rtRef.current; rtRef.current = null;
    try { h?.close(); } catch {}
    setRtActive(false); setStatus('');
  };

  // ---------- YEDEK: BAS-KONUŞ (Whisper + /conversation + ElevenLabs) ----------
  const startRec = async () => {
    if (busyRef.current || !tenantId) return;
    try {
      unlockAudio(); setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const mime = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      mr.start();
      mrRef.current = mr;
      setStatus('🎙️ Dinliyorum... (bırakınca gönder)');
    } catch (e) { setError('Mikrofon açılamadı: ' + (e as Error).message); setStatus(''); }
  };

  const stopRec = async () => {
    const mr = mrRef.current;
    if (!mr || mr.state === 'inactive') return;
    busyRef.current = true;
    const blobP = new Promise<Blob>((resolve) => { mr.onstop = () => resolve(new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })); });
    try { mr.stop(); } catch { /* noop */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null; mrRef.current = null;
    const blob = await blobP;
    setStatus('✍️ Yazıya çeviriyorum...');
    try {
      const fd = new FormData(); fd.append('audio', blob, 'audio.webm');
      const r = await fetch(`/api/ai-employee/${tenantId}/transcribe`, { method: 'POST', headers: authHeaders(false), body: fd });
      const j = await r.json().catch(() => null);
      const text = String(j?.text || '').trim();
      if (!text) { setStatus('Ses anlaşılamadı, tekrar deneyin.'); busyRef.current = false; return; }
      await sendToBrain(text);
    } catch (e) { setError('STT hatası: ' + (e as Error).message); setStatus(''); }
    finally { busyRef.current = false; }
  };

  const sendToBrain = async (text: string) => {
    const userMsg: Msg = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setStatus('🤔 Sipariş beyni düşünüyor...');
    try {
      const res = await fetch('/api/conversation', {
        method: 'POST', headers: authHeaders(true),
        body: JSON.stringify({ tenantId, channel: 'phone', phone, messages: next, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'conversation hatası');
      const reply = String(data?.reply || '');
      setMessages([...next, { role: 'assistant', content: reply }]);
      setSessionId(data?.sessionId || sessionId);
      setMeta({ intent: data?.intent, confidence: data?.confidence, orderCreated: data?.orderCreated, orderNumber: data?.orderNumber, sessionId: data?.sessionId, needsHuman: data?.needsHuman });
      setStatus('🔊 Seslendiriyorum...');
      try {
        const sp = await fetch(`/api/ai-employee/${tenantId}/voice/speak`, { method: 'POST', headers: authHeaders(true), body: JSON.stringify({ text: reply }) });
        const spj = await sp.json().catch(() => null);
        if (spj?.audioUrl) await playUrl(spj.audioUrl);
      } catch { /* TTS hatası metni engellemez */ }
      setStatus('');
    } catch (e) { setError('Beyin hatası: ' + (e as Error).message); setStatus(''); }
  };

  const reset = () => { setMessages([]); setSessionId(undefined); setMeta({}); setError(''); setStatus(''); setLiveAiText(''); };
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sipariş AI (Sesli Test)</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          <b>Canlı</b>: Gemini Live (birincil) · <b>Bas-Konuş</b>: Whisper→beyin→TTS (yedek). Sipariş onaylanınca gerçek sipariş oluşur.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600 dark:text-slate-300">Müşteri telefon:</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
        <label className="text-sm text-slate-600 dark:text-slate-300">Ses:</label>
        <select value={voice} onChange={(e) => setVoice(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
          <option value="Aoede">Aoede (sıcak kadın)</option>
          <option value="Kore">Kore (net kadın)</option>
          <option value="Zephyr">Zephyr (neşeli kadın)</option>
          <option value="Leda">Leda (genç kadın)</option>
          <option value="Achird">Achird (erkek, sıcak)</option>
        </select>
        <button onClick={reset} className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-300 dark:hover:bg-slate-600">Temizle</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {!rtActive ? (
          <button onClick={startRealtime}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold shadow-lg">
            🟢 Canlı Başlat (Realtime)
          </button>
        ) : (
          <button onClick={stopRealtime}
            className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-base font-bold shadow-lg">
            ⏹ Canlı Durdur
          </button>
        )}
        <button
          onPointerDown={startRec}
          onPointerUp={stopRec}
          onPointerLeave={() => { if (mrRef.current) void stopRec(); }}
          className="select-none w-full py-4 rounded-2xl bg-slate-700 hover:bg-slate-800 active:bg-slate-900 text-white text-base font-bold shadow-lg">
          🎙️ Bas-Konuş (Yedek)
        </button>
      </div>

      {status && <div className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">{status}</div>}
      {fallbackMode && <div className="text-sm text-amber-600 dark:text-amber-400 font-semibold">Canlı yok — Bas-Konuş (Yedek) modu aktif.</div>}
      {error && <div className="text-sm text-red-600 dark:text-red-400 font-semibold">{error}</div>}

      {(meta.orderCreated != null || meta.intent || meta.confidence != null) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {meta.intent && <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">niyet: {meta.intent}</span>}
          {meta.confidence != null && <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">güven: {meta.confidence}</span>}
          {meta.orderCreated != null && (
            <span className={`px-2 py-1 rounded font-semibold ${meta.orderCreated ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {meta.orderCreated ? `✅ Sipariş oluştu: #${meta.orderNumber || ''}` : 'sipariş henüz oluşmadı'}
            </span>
          )}
          {meta.needsHuman && <span className="px-2 py-1 rounded bg-red-100 text-red-700 font-semibold">insana devredildi</span>}
        </div>
      )}

      {lastUser && <div className="text-sm text-slate-500 dark:text-slate-400">Sen: {lastUser}</div>}
      {liveAiText && <div className="text-sm text-slate-900 dark:text-slate-100 font-medium">AI (canlı): {liveAiText.trim()}</div>}

      <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-900 min-h-[120px]">
        {messages.length === 0 && <p className="text-sm text-slate-400">Henüz konuşma yok. "Canlı Başlat" → "Merhaba, 5 kilo sucuk almak istiyorum" diyerek başlayın.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`text-sm ${m.role === 'user' ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100 font-medium'}`}>
            <span className="font-semibold">{m.role === 'user' ? 'Sen' : 'AI'}:</span> {m.content}
          </div>
        ))}
      </div>
    </div>
  );
}
