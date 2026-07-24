'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ShoppingBag, Users, AlertTriangle, Package, LayoutDashboard, Settings, BellRing, BarChart3, X } from 'lucide-react';

const PAGES = [
  { href: '/dashboard', label: 'Kontrol Paneli', icon: LayoutDashboard, keywords: 'dashboard kontrol panel ana sayfa' },
  { href: '/orders', label: 'Siparisler', icon: ShoppingBag, keywords: 'siparis order' },
  { href: '/customers', label: 'Musteriler', icon: Users, keywords: 'musteri customer cari' },
  { href: '/complaints', label: 'Sikayetler', icon: AlertTriangle, keywords: 'sikayet complaint ticket' },
  { href: '/products', label: 'Urunler', icon: Package, keywords: 'urun product stok' },
  { href: '/reports', label: 'Raporlar', icon: BarChart3, keywords: 'rapor report analiz' },
  { href: '/notifications', label: 'Bildirimler', icon: BellRing, keywords: 'bildirim notification' },
  { href: '/settings', label: 'Ayarlar', icon: Settings, keywords: 'ayar setting config' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const filtered = PAGES.filter((p) =>
    p.label.toLowerCase().includes(query.toLowerCase()) ||
    p.keywords.toLowerCase().includes(query.toLowerCase())
  );

  const navigate = useCallback((href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  }, [router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sayfa ara veya gitmek istediginiz yeri yazin..."
            className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-400">
            <X className="w-3 h-3" /> ESC
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2 space-y-0.5">
          {filtered.map((page) => {
            const Icon = page.icon;
            return (
              <button key={page.href} onClick={() => navigate(page.href)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left">
                <Icon className="w-4 h-4 text-slate-400" />
                <span>{page.label}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-400">Sonuc bulunamadi</div>
          )}
        </div>
      </div>
    </div>
  );
}
