'use client';

import { useEffect, useState } from 'react';

export default function AdminPage() {
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [tenants, setTenants] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => setStats(d)).catch(() => {});
    fetch('/api/admin/tenants').then(r => r.json()).then(d => { if (Array.isArray(d)) setTenants(d); }).catch(() => {});
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Geliştirici Paneli</h1>
        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">SÜPER YÖNETİCİ</span>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-2">
        <p className="text-sm text-gray-600 dark:text-slate-300 dark:text-slate-300 leading-relaxed">
          Bu sayfa, tüm sisteme ait genel istatistikleri gösterir. <strong>Süper yönetici</strong> rolündeki kullanıcılar
          buradan tüm firmaları (tenant) görüntüleyebilir, sistem genelindeki sipariş, müşteri, ciro ve AI konuşma
          verilerini takip edebilir.
        </p>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          ⚠️ <strong>Önemli:</strong> Şu an için bu sayfaya herkes erişebilir. Canlıya geçtiğinizde, sadece <strong>süper yönetici</strong> rolündeki kullanıcıların görebilmesi için backend'de rol bazlı erişim kontrolü (RBAC) eklenmelidir. Şu an demo aşamasında olduğumuz için bu kontrol aktif değil.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Toplam Firma', value: String(stats.tenants || 0), icon: '🏢', color: 'from-blue-500 to-blue-600' },
          { label: 'Toplam Sipariş', value: String(stats.orders || 0), icon: '📦', color: 'from-emerald-500 to-emerald-600' },
          { label: 'Toplam Müşteri', value: String(stats.customers || 0), icon: '👥', color: 'from-violet-500 to-violet-600' },
          { label: 'Toplam Ciro', value: `${Number(stats.revenue || 0).toLocaleString('tr-TR')} TL`, icon: '💰', color: 'from-amber-500 to-amber-600' },
          { label: 'Toplam Kullanıcı', value: String(stats.users || 0), icon: '👤', color: 'from-cyan-500 to-cyan-600' },
          { label: 'AI Konuşma', value: String(stats.aiConversations || 0), icon: '🤖', color: 'from-purple-500 to-purple-600' },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl p-4 bg-gradient-to-br ${c.color} text-white`}>
            <div className="text-xl">{c.icon}</div>
            <div className="text-2xl font-bold mt-1">{String(c.value)}</div>
            <div className="text-xs opacity-90">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold">Kayıtlı Firmalar ({tenants.length})</h2>
        </div>
        <div className="divide-y">
          {tenants.map((t) => (
            <div key={t.id as string} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{t.company_name as string}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 dark:text-slate-400">{t.email as string} · {t.phone as string}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{t.city as string || '-'}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 dark:text-slate-400 dark:text-slate-400'}`}>
                  {t.status as string}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
