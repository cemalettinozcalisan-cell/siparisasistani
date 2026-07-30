'use client';

import { useState } from 'react';
import { Plus, ShoppingBag, Users, Package, Tags } from 'lucide-react';

const ACTIONS = [
  { href: '/orders', label: 'Yeni Sipariş', icon: ShoppingBag, color: 'bg-blue-500 hover:bg-blue-600' },
  { href: '/customers', label: 'Yeni Müşteri', icon: Users, color: 'bg-emerald-500 hover:bg-emerald-600' },
  { href: '/products', label: 'Yeni Ürün', icon: Package, color: 'bg-violet-500 hover:bg-violet-600' },
  { href: '/campaigns', label: 'Yeni Kampanya', icon: Tags, color: 'bg-amber-500 hover:bg-amber-600' },
];

export function QuickActions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="flex flex-col gap-1.5 animate-slide-up">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <a key={a.label} href={a.href}
                className={`flex items-center gap-2.5 px-4 py-2.5 ${a.color} text-white rounded-xl text-sm font-medium shadow-lg transition-all hover:scale-105`}>
                <Icon className="w-4 h-4" />
                {a.label}
              </a>
            );
          })}
        </div>
      )}
      <button onClick={() => setOpen(!open)}
        className={`w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-2xl ${open ? 'rotate-45' : ''}`}>
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
