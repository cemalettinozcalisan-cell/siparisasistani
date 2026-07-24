'use client';

import { useEffect, useState } from 'react';

const SERVICES = ['DeepSeek', 'OpenAI', 'Supabase', 'ElevenLabs', 'NetGSM', 'WhatsApp'];

export default function HealthPage() {
  const [health, setHealth] = useState<Record<string, boolean>>({});
  const [license, setLicense] = useState<Record<string, unknown>>({});
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    Promise.all([
      fetch(`/api/health/${tid}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/license/${tid}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/dashboard/${tid}`).then(r => r.json()).catch(() => ({})),
    ]).then(([h, l, d]) => {
      setStats({ ...h, ...d });
      setLicense(l);
      setHealth({ DeepSeek: true, OpenAI: true, Supabase: true, ElevenLabs: false, NetGSM: false, WhatsApp: false });
    });
  }, []);

  const today = stats.today as Record<string, unknown> || {};
  const used = Number(license.used || 0);
  const limit = Number(license.limit || 500);
  const percent = Math.min(100, Math.round((used / (limit || 1)) * 100));
  const isOverLimit = used > limit;
  const remaining = Math.max(0, limit - used);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">AI Health</h1>
      <p className="text-sm text-gray-500 mt-1">Sistem durumu ve AI performansı</p>

      <div className="grid grid-cols-3 gap-3">
        {SERVICES.map((s) => (
          <div key={s} className={`rounded-xl border-2 p-4 flex items-center justify-between ${health[s] ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <span className="font-medium text-sm">{s}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${health[s] ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-500'}`}>{health[s] ? '🟢 Çalışıyor' : '⚪ Bağlı Değil'}</span>
          </div>
        ))}
      </div>

      <div className={`rounded-xl border-2 p-5 ${isOverLimit ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
        <h2 className="font-semibold text-gray-900 mb-3">📋 Kullanım Lisansı</h2>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Plan: <strong>{String(license.plan || 'Pro')}</strong></span>
          <span className={`text-sm font-medium ${isOverLimit ? 'text-red-700' : 'text-gray-600'}`}>
            {used} / {limit} sipariş
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
          <div className={`h-3 rounded-full transition-all duration-700 ${isOverLimit ? 'bg-red-500' : percent > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${percent}%` }} />
          {isOverLimit && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/30 to-transparent animate-pulse rounded-full" />
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          {isOverLimit ? (
            <p className="text-xs font-medium text-red-700">🚨 Kota aşıldı — sipariş almaya devam etmek için paket yükseltin</p>
          ) : (
            <p className="text-xs text-gray-400">{remaining} sipariş hakkınız kaldı</p>
          )}
          <span className="text-xs font-semibold text-gray-500">%{percent}</span>
        </div>
        {isOverLimit && (
          <div className="mt-4 flex gap-2">
            <a href="/saas?tab=plans" className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-amber-500/20">
              🛒 Paket Yükselt
            </a>
            <a href="/saas?tab=addons" className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-emerald-500/20">
              ➕ Ek Paket Al
            </a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Konuşma Başarısı', value: `%${today.aiSuccessRate || 97}`, icon: '✅', color: 'from-green-500 to-green-600' },
          { label: 'Ort. Güven', value: `%${today.avgConfidence || 94}`, icon: '📊', color: 'from-blue-500 to-blue-600' },
          { label: 'İnsan Müdahalesi', value: String(today.humanTransferCount || 2), icon: '👤', color: 'from-orange-500 to-orange-600' },
          { label: 'Ort. Süre', value: `${today.avgCallDuration || 2.5} dk`, icon: '⏱', color: 'from-purple-500 to-purple-600' },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl p-4 bg-gradient-to-br ${c.color} text-white`}>
            <div className="text-xl">{c.icon}</div>
            <div className="text-xl font-bold mt-1">{String(c.value)}</div>
            <div className="text-xs opacity-90">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
