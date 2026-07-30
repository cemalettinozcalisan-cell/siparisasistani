'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'printer-sound-enabled';

export function usePrinterSound() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setEnabled(stored !== 'false');
  }, []);

  const toggle = (val: boolean) => {
    setEnabled(val);
    localStorage.setItem(STORAGE_KEY, String(val));
  };

  const play = () => {
    if (!enabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(800, ctx.currentTime);
      o.frequency.setValueAtTime(600, ctx.currentTime + 0.05);
      o.frequency.setValueAtTime(400, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.2);
    } catch {}
  };

  return { enabled, toggle, play };
}

export function PrinterSoundToggle({ enabled, onToggle }: { enabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <div className="flex items-center gap-2">
        <span className="text-lg">🖨️</span>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">Yazıcı Sesi</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 dark:text-slate-400">Yeni siparişte ses çal</p>
        </div>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-violet-600' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}
