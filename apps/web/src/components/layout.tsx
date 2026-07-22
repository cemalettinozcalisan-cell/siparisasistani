'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/live', label: 'Canlı Siparişler', icon: '🔔' },
  { href: '/orders', label: 'Siparişler', icon: '📋' },
  { href: '/conversations', label: 'Konuşmalar', icon: '📞' },
  { href: '/complaints', label: 'Şikayetler', icon: '⚠️' },
  { href: '/customers', label: 'Müşteriler', icon: '👥' },
  { href: '/products', label: 'Ürünler', icon: '📦' },
  { href: '/campaigns', label: 'Kampanyalar', icon: '🏷️' },
  { href: '/reports', label: 'Raporlar', icon: '📊' },
  { href: '/users', label: 'Kullanicilar', icon: '👥' },
  { href: '/settings', label: 'Ayarlar', icon: '⚙️' },
  { href: '/demo', label: 'Demo Modu', icon: '🎯' },
  { href: '/health', label: 'AI Health', icon: '📈' },
  { href: '/replay', label: 'Konuşma Kayıtları', icon: '🎙' },
  { href: '/ai-test', label: 'AI Test', icon: '🤖' },
  { href: '/prompts', label: 'Promptlar', icon: '📝' },
];

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<string, unknown[]>>({});
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
    setQuery('');
    setResults({});
  }, [pathname]);

  useEffect(() => {
    if (query.length < 2) { setResults({}); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/demo-tenant-id?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setOpen(true);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Ara (sipariş, müşteri, ürün)..."
        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-blue-300 outline-none"
      />
      {open && (results.orders?.length > 0 || results.customers?.length > 0 || results.products?.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-2 space-y-1 max-h-80 overflow-y-auto">
          {(results.orders as { id: string; order_number: string; total_price: number; status: string }[])?.map((o) => (
            <a key={o.id} href={`/orders/${o.id}`} className="block px-3 py-2 rounded-lg hover:bg-gray-50 text-sm">
              <span className="font-medium">📋 #{o.order_number}</span>
              <span className="ml-2 text-gray-500">{Number(o.total_price).toLocaleString('tr-TR')} TL</span>
              <span className="ml-2 text-xs text-gray-400">{o.status}</span>
            </a>
          ))}
          {(results.customers as { id: string; name: string; phone: string; city: string }[])?.map((c) => (
            <div key={c.id} className="px-3 py-2 rounded-lg text-sm">
              <span className="font-medium">👤 {c.name}</span>
              <span className="ml-2 text-gray-500">{c.phone}</span>
              {c.city && <span className="ml-2 text-xs text-gray-400">{c.city}</span>}
            </div>
          ))}
          {(results.products as { id: string; product_name: string; price: number; unit: string }[])?.map((p) => (
            <div key={p.id} className="px-3 py-2 rounded-lg text-sm">
              <span className="font-medium">📦 {p.product_name}</span>
              <span className="ml-2 text-gray-500">{Number(p.price).toLocaleString('tr-TR')} TL/{p.unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 space-y-2">
          <h1 className="text-lg font-bold text-gray-900">SiparişAsistanı</h1>
          <GlobalSearch />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <button onClick={() => { if (typeof window !== 'undefined') { localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); window.location.href = '/login'; } }}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <span>🚪</span>
            <span>Cikis Yap</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
