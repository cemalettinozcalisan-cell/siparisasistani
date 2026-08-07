'use client';

import { getTenantId } from '@/lib/tenant';

import { useEffect, useState } from 'react';

const PLANS = [
  { code: 'starter', name: '🥉 Başlangıç Paketi', price: 3999, orders: 150, popular: false },
  { code: 'pro', name: '🥈 Pro Esnaf Paketi', price: 7999, orders: 300, popular: true },
  { code: 'ultra', name: '🥇 Ultra Pro Esnaf', price: 11999, orders: 600, popular: false },
  { code: 'premium', name: '💎 Premium Esnaf', price: 19999, orders: 1500, popular: false },
];

const PLAN_FEATURES = [
  'AI Sipariş Alma', 'WhatsApp Entegrasyonu', 'Panel', 'CRM', 'Raporlar', 'Kampanyalar', 'Destek',
];

const ADDONS = [
  { name: 'Mini Ek Paket', quota: 100, price: 3999 },
  { name: 'Standart Ek Paket', quota: 250, price: 8999 },
  { name: 'Mega Ek Paket', quota: 500, price: 15999 },
];

const STATUS_TR: Record<string, string> = {
  active: 'Aktif', pending: 'Beklemede', cancelled: 'İptal Edildi', past_due: 'Vadesi Geçmiş',
  paid: 'Ödendi', unpaid: 'Ödenmedi',
};

export default function SaasPage() {
  const [tab, setTab] = useState('subscription');
  const [sub, setSub] = useState<Record<string, unknown> | null>(null);
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null);
  const [invoices, setInvoices] = useState<Record<string, unknown>[]>([]);
  const tid = getTenantId();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t) setTab(t);
    Promise.all([
      fetch(`/api/saas/subscription/${tid}`).then(r => r.json()).catch(() => null),
      fetch(`/api/saas/usage/${tid}`).then(r => r.json()).catch(() => null),
      fetch(`/api/saas/invoices/${tid}`).then(r => r.json()).catch(() => []),
    ]).then(([s, u, inv]) => {
      setSub(s as Record<string, unknown>);
      setUsage(u as Record<string, unknown>);
      if (Array.isArray(inv)) setInvoices(inv);
    });
  }, []);

  const currentPlanCode = (sub?.plan as Record<string, unknown>)?.code as string || 'starter';

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Abonelik Yönetimi</h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 dark:text-slate-400">Abonelik, kullanım ve faturalandırma</p>

      <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700 pb-1">
        {[
          { key: 'subscription', label: '💳 Abonelik' },
          { key: 'usage', label: '📊 Kullanım' },
          { key: 'plans', label: '📦 Paketler' },
          { key: 'addons', label: '➕ Ek Paketler' },
          { key: 'invoices', label: '💰 Faturalar' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t.key ? 'bg-white dark:bg-slate-800 border border-b-white border-gray-200 dark:border-slate-700 text-blue-600' : 'text-gray-500 dark:text-slate-400 dark:text-slate-400 hover:text-gray-700 dark:text-slate-200 dark:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'subscription' && sub && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{PLANS.find(p => p.code === ((sub.plan as Record<string, unknown>)?.code as string || currentPlanCode))?.name || 'Aktif Plan'}</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 dark:text-slate-400">Durum: <span className="font-medium text-green-600">Aktif</span></p>
            </div>
            <span className="text-2xl">{sub.status === 'active' ? '✅' : '⏸'}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
              <span className="text-gray-500 dark:text-slate-400">Başlangıç</span>
              <p className="font-medium text-gray-900 dark:text-white">{new Date(sub.current_period_start as string).toLocaleDateString('tr-TR')}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
              <span className="text-gray-500 dark:text-slate-400">Bitiş</span>
              <p className="font-medium text-gray-900 dark:text-white">{new Date(sub.current_period_end as string).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
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

      {tab === 'subscription' && !sub && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 text-center text-gray-400">
          <p className="text-3xl mb-2">💳</p>
          <p>Henüz abonelik bilgisi bulunamadı. Bir paket seçin.</p>
        </div>
      )}

      {tab === 'usage' && usage && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white dark:text-white">Sipariş Kullanımı</h2>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-slate-300 dark:text-slate-300">{String(usage.ordersUsed)} / {String(usage.orderLimit)} sipariş</span>
            <span className={`text-sm font-bold ${(usage.usagePercent as number) > 80 ? 'text-red-600' : (usage.usagePercent as number) > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
              %{String(usage.usagePercent || 0)}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all ${(usage.usagePercent as number) > 80 ? 'bg-red-500' : (usage.usagePercent as number) > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, usage.usagePercent as number)}%` }} />
          </div>
          <p className="text-xs text-gray-400">{usage.remaining as number} sipariş hakkınız kaldı</p>
        </div>
      )}

      {tab === 'usage' && !usage && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 text-center text-gray-400">
          <p className="text-3xl mb-2">📊</p>
          <p>Kullanım bilgisi bulunamadı</p>
        </div>
      )}

      {tab === 'plans' && (
        <div className="grid grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.code === currentPlanCode;
            return (
              <div key={plan.code} className={`rounded-xl border-2 p-5 flex flex-col ${isCurrent ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'} ${plan.popular ? 'relative' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-amber-500 text-white text-xs font-semibold rounded-full">POPÜLER</div>
                )}
                <div className="text-lg font-bold text-gray-900 dark:text-white dark:text-white">{plan.name}</div>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">{plan.price.toLocaleString('tr-TR')}</span>
                  <span className="text-sm text-gray-500 dark:text-slate-400 dark:text-slate-400 ml-1">TL / Ay</span>
                </div>
                <div className="text-sm text-gray-500 dark:text-slate-400 dark:text-slate-400 mt-1">
                  <span className="font-semibold text-gray-700 dark:text-slate-200 dark:text-slate-200">{plan.orders} Sipariş</span> / Ay
                </div>
                <div className="mt-4 space-y-2 flex-1">
                  {PLAN_FEATURES.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <span className="text-green-500 text-xs">✅</span>
                      <span className="text-gray-700 dark:text-slate-200 dark:text-slate-200">{f}</span>
                    </div>
                  ))}
                </div>
                {!isCurrent && (
                  <button className="mt-4 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20">
                    Geçiş Yap
                  </button>
                )}
                {isCurrent && (
                  <div className="mt-4 w-full py-2.5 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium text-center">Aktif Plan</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'addons' && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {ADDONS.map((p) => (
              <div key={p.name} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 flex flex-col">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white dark:text-white">{p.name}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 dark:text-slate-400 mt-1">+{p.quota} Ek Sipariş Kotası</p>
                <div className="mt-3">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{p.price.toLocaleString('tr-TR')}</span>
                  <span className="text-sm text-gray-500 dark:text-slate-400 dark:text-slate-400 ml-1">TL</span>
                </div>
                <button className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-emerald-500/20">
                  Satın Al
                </button>
              </div>
            ))}
          </div>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 text-sm space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-lg shrink-0 mt-0.5">💡</span>
              <div>
                <p className="font-semibold text-amber-900">Ek Paket Kullanım Şartları</p>
                <p className="text-amber-800 mt-1">Ek paketler ana planınıza eklenir. İki seçenek sunulur:</p>
                <ul className="mt-2 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 shrink-0 mt-0.5">❶</span>
                    <span><strong className="text-amber-900">Tek Seferlik:</strong> Satın alındığı tarihten itibaren <strong>30 gün</strong> geçerlidir. Süre sonunda ek sipariş hakkınız otomatik olarak yenilenmez.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 shrink-0 mt-0.5">❷</span>
                    <span><strong className="text-amber-900">Otomatik Yenileme:</strong> Her ay düzenli olarak ek paket hakkınız yenilenir ve faturanıza yansıtılır. İstediğiniz zaman iptal edebilirsiniz.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 divide-y">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white dark:text-white">Fatura Geçmişi</h2>
            <span className="text-xs text-gray-400">{invoices.length} fatura</span>
          </div>
          {invoices.map((inv) => (
            <div key={inv.id as string} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium">{(inv as Record<string, string>).invoice_number}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 dark:text-slate-400">{inv.description as string}</p>
                <p className="text-xs text-gray-400">{new Date(inv.created_at as string).toLocaleDateString('tr-TR')}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-bold">{Number(inv.amount || 0).toLocaleString('tr-TR')} TL</p>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {STATUS_TR[inv.status as string] || (inv.status as string)}
                  </span>
                </div>
                <button onClick={() => { const w = window.open('', '_blank'); if (!w) return; w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fatura ${(inv as Record<string, string>).invoice_number}</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#333}h1{color:#1a56db;border-bottom:2px solid #1a56db;padding-bottom:8px}.info{background:#f9fafb;padding:16px;border-radius:8px;margin:20px 0;font-size:14px}.info div{margin:4px 0}.amount{font-size:28px;font-weight:bold;color:#111827;text-align:center;margin:30px 0}.footer{margin-top:40px;font-size:11px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:12px}</style></head><body><h1>📄 Fatura</h1><p style="color:#6b7280">Fatura No: ${(inv as Record<string, string>).invoice_number}</p><div class="info"><div><strong>Tarih:</strong> ${new Date(inv.created_at as string).toLocaleDateString('tr-TR')}</div><div><strong>Durum:</strong> ${STATUS_TR[inv.status as string] || inv.status}</div><div><strong>Açıklama:</strong> ${inv.description as string || '-'}</div></div><div class="amount">${Number(inv.amount || 0).toLocaleString('tr-TR')} TL</div><div class="footer">SiparişAsistanı - Otomatik oluşturulmuştur</div><script>window.onload=function(){window.print()}<\/script></body></html>`); w.document.close(); }} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100">
                  📄 PDF
                </button>
              </div>
            </div>
          ))}
          {invoices.length === 0 && (
            <div className="p-6 text-center text-gray-400 text-sm">Henüz fatura bulunmuyor</div>
          )}
        </div>
      )}
    </div>
  );
}
