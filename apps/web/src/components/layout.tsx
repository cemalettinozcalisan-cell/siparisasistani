'use client';

import Link from 'next/link';
import { getTenantId } from '@/lib/tenant';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { NotificationBell } from '@/components/notification-bell';
import { CommandPalette } from '@/components/command-palette';
import { TenantSwitcher } from '@/components/tenant-switcher';
import { PrinterSoundToggle, usePrinterSound } from '@/components/printer-sound';
import { Search, Moon, Sun, ChevronRight, LogOut, LayoutDashboard, BellRing, ShoppingBag, AlertTriangle, Users, Package, Tags, Settings, Shield, BarChart3, Mic, Activity, TestTube, FileText, Menu, X, Webhook, Key, Bot, CreditCard, ChevronDown, ChevronUp, Zap, Clock, Phone } from 'lucide-react';

// Sync fetch interceptor — must run before any component renders
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    const isApi = url.startsWith('/api/');
    if (!isApi) return originalFetch(input, init);

    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const headers = new Headers(init?.headers);
        if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
        const res = await originalFetch(input, { ...init, headers });
        // Auto re-login on 401 (backend restart clears in-memory sessions)
        if (res.status === 401) {
          try {
            const reAuth = await originalFetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: 'demo@siparisasistani.com', password: 'demo123' }),
            });
            if (reAuth.ok) {
              const data = await reAuth.json();
              localStorage.setItem('auth_token', data.token);
              localStorage.setItem('auth_user', JSON.stringify(data.user));
              headers.set('Authorization', `Bearer ${data.token}`);
              return originalFetch(input, { ...init, headers });
            }
          } catch {}
        }
        return res;
      }
    } catch {}
    return originalFetch(input, init);
  };
}

const navItems = [
  // Ana
  { href: '/dashboard', label: 'Kontrol Paneli', icon: LayoutDashboard, roles: ['owner', 'manager', 'staff'], group: 'main' },
  { href: '/orders?tab=active', label: 'Aktif Siparişler', icon: Zap, roles: ['owner', 'manager', 'staff'], group: 'main' },
  { href: '/orders?tab=history', label: 'Geçmiş Siparişler', icon: Clock, roles: ['owner', 'manager', 'staff'], group: 'main' },
  { href: '/customers', label: 'Müşteriler', icon: Users, roles: ['owner', 'manager', 'staff'], group: 'main' },
  { href: '/calls', label: 'Görüşmeler', icon: Phone, roles: ['owner', 'manager', 'staff'], group: 'main' },
  { href: '/products', label: 'Ürünler', icon: Package, roles: ['owner', 'manager', 'staff'], group: 'main' },
  { href: '/complaints', label: 'Talep & İstek', icon: AlertTriangle, roles: ['owner', 'manager', 'staff'], group: 'main' },
  { href: '/notifications', label: 'Bildirimler', icon: BellRing, roles: ['owner', 'manager', 'staff'], group: 'main' },
  { href: '/reports', label: 'Raporlar', icon: BarChart3, roles: ['owner', 'manager', 'staff'], group: 'main' },
  // Pazarlama
  { href: '/marketing', label: 'Pazarlama', icon: Tags, roles: ['owner', 'manager'], group: 'main' },
  // Abonelik
  { href: '/saas', label: 'Abonelik', icon: CreditCard, roles: ['owner', 'manager'], group: 'saas' },
  // Ayarlar
  { href: '/settings', label: 'İşletme Ayarları', icon: Settings, roles: ['owner', 'manager'], group: 'settings' },
  { href: '/users', label: 'Kullanıcılar', icon: Users, roles: ['owner', 'manager'], group: 'settings' },
  { href: '/integrations', label: 'Entegrasyonlar', icon: Webhook, roles: ['owner'], group: 'settings' },
  { href: '/api-keys', label: 'API Anahtarları', icon: Key, roles: ['owner'], group: 'settings' },
  { href: '/ai-audit', label: 'AI Denetim', icon: Mic, roles: ['owner', 'manager'], group: 'settings' },
  { href: '/health', label: 'Sistem Durumu', icon: Activity, roles: ['owner', 'manager', 'staff'], group: 'settings' },
  { href: '/settings/audit-logs', label: 'Sistem Logları', icon: BarChart3, roles: ['owner', 'manager'], group: 'settings' },
  { href: '/ai-test', label: 'AI Sohbet', icon: Bot, roles: ['owner'], group: 'settings' },
  { href: '/prompts', label: 'Promptlar', icon: FileText, roles: ['owner'], group: 'settings' },
  // Geliştirici
  { href: '/admin', label: 'Geliştirici', icon: Shield, roles: ['owner'], group: 'admin' },
];

const SIDEBAR_GROUPS = [
  { key: 'main', label: null, icon: null },
  { key: 'saas', label: null, icon: null },
  { key: 'settings', label: 'Ayarlar', icon: Settings },
  { key: 'admin', label: null, icon: null },
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
        const res = await fetch(`/api/search/${getTenantId()}?q=${encodeURIComponent(query)}`);
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
          placeholder="Ara..."
          className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 rounded text-[10px] text-slate-400 font-medium">⌘K</kbd>
      </div>
      {open && (results.orders?.length > 0 || results.customers?.length > 0 || results.products?.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-premium-hover z-50 p-2 space-y-0.5 max-h-72 overflow-y-auto">
          {(results.customers as { id: string; name: string; phone: string }[])?.slice(0, 3).map((c) => (
            <a key={c.id} href="/customers" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm">
              <Users className="w-4 h-4 text-slate-400" /><span className="font-medium">{c.name}</span>
              <span className="text-slate-500 text-xs">{c.phone}</span>
            </a>
          ))}
          {(results.orders as { id: string; order_number: string; total_price: number }[])?.slice(0, 3).map((o) => (
            <a key={o.id} href="/orders" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm">
              <ShoppingBag className="w-4 h-4 text-slate-400" /><span className="font-medium">#{o.order_number}</span>
              <span className="text-slate-500">{Number(o.total_price).toLocaleString('tr-TR')} TL</span>
            </a>
          ))}
          {(results.products as { id: string; product_name: string; price: number }[])?.slice(0, 3).map((p) => (
            <a key={p.id} href="/products" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm">
              <Package className="w-4 h-4 text-slate-400" /><span className="font-medium">{p.product_name}</span>
              <span className="text-slate-500">{Number(p.price).toLocaleString('tr-TR')} TL</span>
            </a>
          ))}
          {results.orders?.length === 0 && results.customers?.length === 0 && results.products?.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-slate-400">Sonuç bulunamadı</div>
          )}
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="btn-icon hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function getUserRole(): string {
  if (typeof window === 'undefined') return 'owner';
  try { return JSON.parse(localStorage.getItem('auth_user') || '{}').role || 'owner'; } catch { return 'owner'; }
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [userRole, setUserRole] = useState('owner');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ settings: false });

  useEffect(() => { setUserRole(getUserRole()); }, []);

  // Auto-expand groups if current path is inside them
  useEffect(() => {
    setOpenGroups(prev => {
      const next = { ...prev };
      const inSettings = navItems.filter(i => i.group === 'settings').some(i => pathname === i.href || pathname.startsWith(i.href + '/'));
      if (inSettings) next.settings = true;
      return next;
    });
  }, [pathname]);

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderNavLink = (item: typeof navItems[0]) => {
    const Icon = item.icon;
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Link key={item.href} href={item.href} onClick={mobileOpen ? onClose : undefined}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group ${active ? 'bg-ai-gradient text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
        <Icon className="w-4 h-4 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
        {active && !collapsed && <ChevronRight className="w-3 h-3 ml-auto" />}
      </Link>
    );
  };

  const inner = (
    <>
      <div className="p-4 border-b border-slate-700/50 flex items-center gap-3 h-14">
        <img src="/logo2.png" alt="SiparişAsistanı" className="w-8 h-8 object-contain shrink-0" />
        {!collapsed && <span className="font-semibold text-sm">SiparişAsistanı</span>}
        {mobileOpen && (
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-white lg:hidden"><X className="w-5 h-5" /></button>
        )}
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {SIDEBAR_GROUPS.map(group => {
          const items = navItems.filter(i => i.group === group.key && i.roles.includes(userRole));
          if (items.length === 0) return null;

          // Main group: render directly
          if (group.key === 'main' || group.key === 'saas' || group.key === 'admin') {
            return (
              <div key={group.key}>
                {items.map(item => renderNavLink(item))}
                {group.key !== 'admin' && <div className="my-1 border-t border-slate-700/50 mx-2" />}
              </div>
            );
          }

          // Collapsible groups
          const isOpen = openGroups[group.key] || false;
          const GroupIcon = group.icon!;
          return (
            <div key={group.key}>
              <button onClick={() => toggleGroup(group.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800 ${!collapsed ? '' : 'justify-center'}`}>
                <GroupIcon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="flex-1 text-left text-sm font-semibold text-slate-300">{group.label}</span>}
                {!collapsed && (isOpen ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />)}
              </button>
              {isOpen && !collapsed && (
                <div className="ml-2 pl-4 border-l border-slate-700/50 space-y-0.5">
                  {items.map(item => renderNavLink(item))}
                </div>
              )}
              <div className="my-1 border-t border-slate-700/50 mx-2" />
            </div>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-700/50">
        {!collapsed && (
          <div className="mb-2 px-2 py-1.5">
            <PrinterSoundToggleEnabled />
          </div>
        )}
        <button onClick={() => { localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); window.location.href = '/login'; }}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Çıkış</span>}
        </button>
      </div>
      <button onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors hidden lg:flex">
        <ChevronRight className={`w-3 h-3 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-slate-900 text-white flex-col transition-all duration-300 relative shrink-0 hidden lg:flex`}>
        {inner}
      </aside>
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={onClose}>
          <div className="absolute inset-0 bg-black/50" />
          <aside className="relative w-64 h-full bg-slate-900 text-white flex flex-col overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {inner}
          </aside>
        </div>
      )}
    </>
  );
}

function PrinterSoundToggleEnabled() {
  const { enabled, toggle } = usePrinterSound();
  return <PrinterSoundToggle enabled={enabled} onToggle={toggle} />;
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <LayoutInner>{children}</LayoutInner>
    </ThemeProvider>
  );
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => setMounted(true), []);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);

  if (!mounted) return <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-slate-900">{children}</div>;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-slate-900">
      <CommandPalette />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between gap-2 lg:gap-4">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 max-w-md"><GlobalSearch /></div>
            <div className="flex items-center gap-1 lg:gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-slate-800 border border-indigo-200/50 dark:border-indigo-800/50 rounded-xl shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <Clock size={14} className="text-indigo-500 dark:text-indigo-400" />
                <span className="text-sm font-bold font-mono tabular-nums text-slate-700 dark:text-slate-200">
                  {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <TenantSwitcher />
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
