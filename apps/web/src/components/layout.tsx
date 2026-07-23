'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { NotificationBell } from '@/components/notification-bell';
import { Search, Moon, Sun, ChevronRight, LogOut, LayoutDashboard, BellRing, ShoppingBag, MessageSquare, AlertTriangle, Users, Package, Tags, Settings, Shield, FlaskConical, Activity, Mic, TestTube, FileText } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/live', label: 'Canli Siparisler', icon: BellRing },
  { href: '/orders', label: 'Siparisler', icon: ShoppingBag },
  { href: '/conversations', label: 'Konusmalar', icon: MessageSquare },
  { href: '/complaints', label: 'Sikayetler', icon: AlertTriangle },
  { href: '/customers', label: 'Musteriler', icon: Users },
  { href: '/products', label: 'Urunler', icon: Package },
  { href: '/notifications', label: 'Bildirimler', icon: BellRing },
  { href: '/campaigns', label: 'Kampanyalar', icon: Tags },
  { href: '/saas', label: 'SaaS', icon: Settings },
  { href: '/reports', label: 'Raporlar', icon: Activity },
  { href: '/admin', label: 'Admin', icon: Shield },
  { href: '/ai-audit', label: 'AI Denetim', icon: Mic },
  { href: '/health', label: 'AI Health', icon: Activity },
  { href: '/demo', label: 'Demo', icon: FlaskConical },
  { href: '/ai-test', label: 'AI Test', icon: TestTube },
  { href: '/prompts', label: 'Promptlar', icon: FileText },
];

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<string, unknown[]>>({});
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); setQuery(''); setResults({}); }, [pathname]);

  useEffect(() => {
    if (query.length < 2) { setResults({}); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/00000000-0000-0000-0000-000000000001?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data); setOpen(true);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Ara (siparis, musteri, urun)..."
          className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
        />
      </div>
      {open && (results.orders?.length > 0 || results.customers?.length > 0 || results.products?.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-premium-hover z-50 p-2 space-y-0.5 max-h-72 overflow-y-auto">
          {(results.orders as { id: string; order_number: string; total_price: number; status: string }[])?.map((o) => (
            <a key={o.id} href={`/orders/${o.id}`} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm">
              <ShoppingBag className="w-4 h-4 text-slate-400" />
              <span className="font-medium">#{o.order_number}</span>
              <span className="text-slate-500">{Number(o.total_price).toLocaleString('tr-TR')} TL</span>
            </a>
          ))}
          {(results.customers as { id: string; name: string; phone: string }[])?.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="font-medium">{c.name}</span>
              <span className="text-slate-500">{c.phone}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400">
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useTheme();

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-slate-900 dark:bg-slate-950 text-white flex flex-col transition-all duration-300 relative`}>
      <div className="p-4 border-b border-slate-700/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-ai-gradient flex items-center justify-center text-white text-sm font-bold shrink-0">S</div>
        {!collapsed && <span className="font-semibold text-sm tracking-tight">SiparisAsistani</span>}
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group ${active ? 'bg-ai-gradient text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {active && !collapsed && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-700/50">
        <button onClick={() => { localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); window.location.href = '/login'; }}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Cikis</span>}
        </button>
      </div>
      <button onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors">
        <ChevronRight className={`w-3 h-3 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>
    </aside>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <LayoutInner>{children}</LayoutInner>
    </ThemeProvider>
  );
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900">{children}</div>;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md"><GlobalSearch /></div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
