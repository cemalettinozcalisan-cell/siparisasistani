'use client';

import { useEffect, useState } from 'react';

export default function SaasPage() {
  const [tab, setTab] = useState('subscription');
  const [plans, setPlans] = useState<Record<string, unknown>[]>([]);
  const [addons, setAddons] = useState<Record<string, unknown>[]>([]);
  const [sub, setSub] = useState<Record<string, unknown> | null>(null);
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null);
  const [invoices, setInvoices] = useState<Record<string, unknown>[]>([]);
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    Promise.all([
      fetch('/api/saas/plans').then(r => r.json()).catch(() => []),
      fetch('/api/saas/addons').then(r => r.json()).catch(() => []),
      fetch(`/api/saas/subscription/${tid}`).then(r => r.json()).catch(() => null),
      fetch(`/api/saas/usage/${tid}`).then(r => r.json()).catch(() => null),
      fetch(`/api/saas/invoices/${tid}`).then(r => r.json()).catch(() => []),
    ]).then(([p, a, s, u, inv]) => {
      if (Array.isArray(p)) setPlans(p);
      if (Array.isArray(a)) setAddons(a);
      setSub(s as Record<string, unknown>);
      setUsage(u as Record<string, unknown>);
      if (Array.isArray(inv)) setInvoices(inv);
    });
  }, []);

  const currentPlanCode = (sub?.plan as Record<string, unknown>)?.code as string || 'starter';

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">SaaS Yonetimi</h1>
      <p className="text-sm text-gray-500">Abonelik, kullanim ve faturalandirma</p>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 pb-1">
        {[
          { key: 'subscription', label: '💳 Abonelik' },
          { key: 'usage', label: '📊 Kullanim' },
          { key: 'plans', label: '📦 Paketler' },
          { key: 'addons', label: '➕ Ek Paketler' },
          { key: 'invoices', label: '💰 Faturalar' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t.key ? 'bg-white border border-b-white border-gray-200 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Subscription Tab */}
      {tab === 'subscription' && sub && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{(sub.plan as Record<string, unknown>)?.name as string || 'Aktif Plan'}</h2>
              <p className="text-sm text-gray-500">Durum: <span className="font-medium text-green-600">Aktif</span></p>
            </div>
            <span className="text-2xl">{sub.status === 'active' ? '✅' : '⏸'}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500">Baslangic</span>
              <p className="font-medium">{new Date(sub.current_period_start as string).toLocaleDateString('tr-TR')}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500">Bitis</span>
              <p className="font-medium">{new Date(sub.current_period_end as string).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sub.auto_renew as boolean} onChange={() => {}} />
              Otomatik yenileme
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sub.auto_topup as boolean} onChange={() => {}} />
              Otomatik ek paket al
            </label>
          </div>
        </div>
      )}

      {/* Usage Tab */}
      {tab === 'usage' && usage && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Siparis Kullanimi</h2>
              <span className="text-sm text-gray-500">{usage.planName as string}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{String(usage.ordersUsed)} / {String(usage.orderLimit)} siparis</span>
              <span className={`text-sm font-bold ${(usage.usagePercent as number) > 80 ? 'text-red-600' : (usage.usagePercent as number) > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                %{String(usage.usagePercent || 0)}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all ${(usage.usagePercent as number) > 80 ? 'bg-red-500' : (usage.usagePercent as number) > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, usage.usagePercent as number)}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{usage.remaining as number} siparis hakki kaldi</p>
          </div>
        </div>
      )}

      {/* Plans Tab */}
      {tab === 'plans' && (
        <div className="grid grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.code === currentPlanCode;
            const features = plan.features as string[] || [];
            return (
              <div key={plan.id as string} className={`rounded-xl border-2 p-5 ${isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{plan.name as string}</h3>
                  {isCurrent && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">AKTIF</span>}
                </div>
                <p className="text-2xl font-bold text-gray-900">{Number(plan.price_monthly || 0).toLocaleString('tr-TR')} TL<span className="text-sm font-normal text-gray-500">/ay</span></p>
                <p className="text-sm text-gray-500 mt-1">{plan.order_limit as number} siparis</p>
                <div className="mt-3 space-y-1">
                  {features.map((f: string, i: number) => (
                    <div key={i} className="text-xs text-gray-600">✅ {f}</div>
                  ))}
                </div>
                {!isCurrent && (
                  <button className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Gecis Yap</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add-ons Tab */}
      {tab === 'addons' && (
        <div className="grid grid-cols-3 gap-4">
          {addons.map((pack) => (
            <div key={pack.id as string} className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-lg">{pack.name as string}</h3>
              <p className="text-sm text-gray-500 mt-1">{pack.order_credit as number} ek siparis hakki</p>
              <p className="text-2xl font-bold mt-2">{Number(pack.price || 0).toLocaleString('tr-TR')} TL</p>
              <button className="mt-4 w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Satinal</button>
            </div>
          ))}
        </div>
      )}

      {/* Invoices Tab */}
      {tab === 'invoices' && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y">
          {invoices.map((inv) => (
            <div key={inv.id as string} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium">{(inv as Record<string, string>).invoice_number}</p>
                <p className="text-xs text-gray-500">{inv.description as string}</p>
                <p className="text-xs text-gray-400">{new Date(inv.created_at as string).toLocaleDateString('tr-TR')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{Number(inv.amount || 0).toLocaleString('tr-TR')} TL</p>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {inv.status as string}
                </span>
              </div>
            </div>
          ))}
          {invoices.length === 0 && (
            <div className="p-6 text-center text-gray-400 text-sm">Henuz fatura bulunmuyor</div>
          )}
        </div>
      )}
    </div>
  );
}
