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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">🤖 AI Health</h1>
      <p className="text-sm text-gray-500 mt-1">Sistem durumu ve AI performansi</p>

      <div className="grid grid-cols-3 gap-3">
        {SERVICES.map((s) => (
          <div key={s} className={`rounded-xl border-2 p-4 flex items-center justify-between ${health[s] ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <span className="font-medium text-sm">{s}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${health[s] ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-500'}`}>{health[s] ? '🟢 Calisiyor' : '⚪ Bagli Degil'}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900 mb-3">📋 Kullanim Lisansi</h2>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Plan: <strong>{String(license.plan || 'Pro')}</strong></span>
          <span className="text-sm text-gray-600">{String(license.used || 0)} / {String(license.limit || 500)} siparis</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className={`h-3 rounded-full transition-all ${(license.usagePercent as number || 0) > 80 ? 'bg-red-500' : (license.usagePercent as number || 0) > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(100, license.usagePercent as number || 0)}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{license.remaining || 0} siparis hakki kaldi</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Konusma Basarisi', value: `%${today.aiSuccessRate || 0}`, icon: '✅', color: 'from-green-500 to-green-600' },
          { label: 'Ort. Guven', value: `%${today.avgConfidence || 0}`, icon: '📊', color: 'from-blue-500 to-blue-600' },
          { label: 'Insan Mudahalesi', value: String(today.humanTransferCount || 0), icon: '👤', color: 'from-orange-500 to-orange-600' },
          { label: 'Ort. Sure', value: `${today.avgCallDuration || 0} dk`, icon: '⏱', color: 'from-purple-500 to-purple-600' },
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
