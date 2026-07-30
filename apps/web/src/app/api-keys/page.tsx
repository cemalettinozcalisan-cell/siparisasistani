'use client';

import { useEffect, useState } from 'react';
import { Key, Eye, EyeOff, CheckCircle2, XCircle, RefreshCw, Save, Trash2 } from 'lucide-react';

const PROVIDERS = [
  { key: 'meta_whatsapp', label: 'WhatsApp Business API', fields: ['api_key', 'api_secret'], icon: '💬' },
  { key: 'meta_instagram', label: 'Instagram DM API', fields: ['api_key', 'api_secret'], icon: '📸' },
  { key: 'netgsm', label: 'NetGSM Telefon', fields: ['api_key', 'api_secret'], icon: '📞' },
  { key: 'deepseek', label: 'DeepSeek AI', fields: ['api_key'], icon: '🤖' },
  { key: 'openai', label: 'OpenAI', fields: ['api_key'], icon: '⚡' },
  { key: 'elevenlabs', label: 'ElevenLabs Ses', fields: ['api_key'], icon: '🔊' },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<Record<string, unknown>[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const tid = '00000000-0000-0000-0000-000000000001';

  const load = async () => {
    try {
      const res = await fetch(`/api/api-keys/${tid}`);
      const data = await res.json();
      if (Array.isArray(data)) setKeys(data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const getKey = (provider: string) => keys.find((k) => (k as any).provider === provider) as Record<string, unknown> | undefined;

  const saveKey = async (provider: string) => {
    setSaving(provider);
    const vals = editing[provider] || '';
    const [key, secret] = vals.split('||');
    await fetch(`/api/api-keys/${tid}/${provider}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key || null, api_secret: secret || null }),
    });
    setSaving(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  };

  const testKey = async (provider: string) => {
    const res = await fetch(`/api/api-keys/${tid}/${provider}/test`, { method: 'POST' });
    const data = await res.json();
    alert(`Test sonucu: ${data.status}`);
  };

  const deleteKey = async (provider: string) => {
    if (!confirm('Bu API anahtarını silmek istediğinize emin misiniz?')) return;
    await fetch(`/api/api-keys/${tid}/${provider}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Anahtarları</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Entegrasyon ve servis API anahtarlarınızı yönetin</p>
        </div>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300">✅ Kaydedildi</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {PROVIDERS.map((p) => {
          const existing = getKey(p.key);
          const vals = editing[p.key] !== undefined ? editing[p.key] : (existing ? `${(existing as any).api_key || ''}||${(existing as any).api_secret || ''}` : '');
          const [keyVal, secretVal] = vals.split('||');
          const isConfigured = !!(existing as any)?.api_key;

          return (
            <div key={p.key} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{p.icon}</span>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{p.label}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${isConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {isConfigured ? '✅ Tanımlı' : '⚪ Tanımlı Değil'}
                </span>
              </div>

              <div className="space-y-2">
                {p.fields.includes('api_key') && (
                  <div className="relative">
                    <input type={showSecrets[p.key] ? 'text' : 'password'} value={keyVal || ''}
                      onChange={(e) => setEditing({ ...editing, [p.key]: `${e.target.value}||${secretVal || ''}` })}
                      placeholder="API Key" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white pr-8" />
                    <button onClick={() => setShowSecrets({ ...showSecrets, [p.key]: !showSecrets[p.key] })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showSecrets[p.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                )}
                {p.fields.includes('api_secret') && (
                  <input type={showSecrets[`${p.key}_secret`] ? 'text' : 'password'} value={secretVal || ''}
                    onChange={(e) => setEditing({ ...editing, [p.key]: `${keyVal || ''}||${e.target.value}` })}
                    placeholder="API Secret" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => saveKey(p.key)} disabled={saving === p.key}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50">
                  <Save className="w-3.5 h-3.5" /> {saving === p.key ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                {isConfigured && (
                  <>
                    <button onClick={() => testKey(p.key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-200">
                      <RefreshCw className="w-3.5 h-3.5" /> Test Et
                    </button>
                    <button onClick={() => deleteKey(p.key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
