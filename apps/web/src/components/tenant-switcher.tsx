'use client';

import { useEffect, useState } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { getTenantId, setTenantId, getUserRole, Tenant } from '@/lib/tenant';

export function TenantSwitcher() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selected, setSelected] = useState('');
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState('');

  useEffect(() => {
    setRole(getUserRole());
    setSelected(getTenantId());
    if (getUserRole() !== 'owner') return;
    fetch('/api/admin/tenants')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTenants(data);
        else setTenants([{ id: getTenantId(), company_name: 'Demo İşletme', status: 'active' }]);
      })
      .catch(() => setTenants([{ id: getTenantId(), company_name: 'Demo İşletme', status: 'active' }]));
  }, []);

  if (role !== 'owner') return null;

  const current = tenants.find((t) => t.id === selected);
  const label = current?.company_name || 'Demo İşletme';

  const switchTenant = (id: string) => {
    setSelected(id);
    setTenantId(id);
    setOpen(false);
    window.location.reload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
      >
        <Building2 className="w-3.5 h-3.5" />
        <span className="max-w-[120px] truncate hidden sm:inline">{label}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 py-1 overflow-hidden">
            <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">İşletmeler</div>
            {tenants.map((t) => (
              <button
                key={t.id}
                onClick={() => switchTenant(t.id)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                  t.id === selected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="truncate">{t.company_name}</span>
                {t.city && <span className="text-[10px] text-gray-400 ml-auto">{t.city}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
