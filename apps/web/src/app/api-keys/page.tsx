'use client';

import { getTenantId } from '@/lib/tenant';

import { useEffect, useState, useCallback } from 'react';
import { Eye, EyeOff, Save, RefreshCw, Brain, PhoneCall, Music, MessageCircle, Key } from 'lucide-react';

interface ProviderField {
  name: string;
  label: string;
  placeholder: string;
}

interface Provider {
  key: string;
  label: string;
  icon: string;
  desc: string;
  category: 'ai' | 'communication' | 'tts' | 'social';
  fields: ProviderField[];
  isLinked?: boolean;
}

const PROVIDERS: Provider[] = [
  { key: 'deepseek', label: 'DeepSeek AI', icon: '🤖', desc: 'Yapay zeka sohbet ve sipariş motoru', fields: [{ name: 'api_key', label: 'API Key', placeholder: 'sk-...' }], category: 'ai' },
  { key: 'openai', label: 'OpenAI', icon: '⚡', desc: 'GPT-4o / GPT-4o-mini API', fields: [{ name: 'api_key', label: 'API Key', placeholder: 'sk-proj-...' }], category: 'ai' },
  { key: 'bilge_ai', label: 'Bilge AI (TÜBİTAK)', icon: '🇹🇷', desc: 'Türkiye yerli LLM altyapısı', fields: [{ name: 'api_key', label: 'API Key', placeholder: '...' }, { name: 'endpoint_url', label: 'Endpoint URL', placeholder: 'https://...' }], category: 'ai' },
  { key: 'anthropic', label: 'Anthropic Claude', icon: '🧠', desc: 'Claude 3.5 Sonnet API', fields: [{ name: 'api_key', label: 'API Key', placeholder: 'sk-ant-...' }], category: 'ai' },
  { key: 'netgsm', label: 'NetGSM', icon: '📞', desc: 'Sesli arama ve SMS servisi', fields: [{ name: 'api_key', label: 'Kullanıcı Adı', placeholder: '850...' }, { name: 'api_secret', label: 'Şifre', placeholder: '...' }, { name: 'sms_header', label: 'SMS Başlığı', placeholder: 'SIPARIS' }], category: 'communication' },
  { key: 'twilio', label: 'Twilio', icon: '📱', desc: 'Yedek SMS ve sesli arama', fields: [{ name: 'api_key', label: 'Account SID', placeholder: 'AC...' }, { name: 'api_secret', label: 'Auth Token', placeholder: '...' }, { name: 'phone', label: 'Telefon No', placeholder: '+90...' }], category: 'communication' },
  { key: 'elevenlabs', label: 'ElevenLabs', icon: '🔊', desc: 'AI seslendirme motoru', fields: [{ name: 'api_key', label: 'API Key', placeholder: '...' }], category: 'tts' },
  { key: 'azure_speech', label: 'Azure Speech', icon: '🎙️', desc: 'Microsoft Azure TTS', fields: [{ name: 'api_key', label: 'Subscription Key', placeholder: '...' }, { name: 'region', label: 'Region', placeholder: 'westeurope' }], category: 'tts' },
  { key: 'openai_tts', label: 'OpenAI TTS', icon: '🗣️', desc: 'Mevcut OpenAI key ile seslendirme', fields: [], category: 'tts', isLinked: true },
  { key: 'meta_whatsapp', label: 'WhatsApp Business', icon: '💬', desc: 'WhatsApp Cloud API', fields: [{ name: 'api_key', label: 'Access Token', placeholder: 'EAA...' }, { name: 'api_secret', label: 'Phone Number ID', placeholder: '...' }], category: 'social' },
  { key: 'meta_instagram', label: 'Instagram DM', icon: '📸', desc: 'Instagram Mesajlaşma API', fields: [{ name: 'api_key', label: 'Access Token', placeholder: 'EAA...' }, { name: 'api_secret', label: 'Page ID', placeholder: '...' }], category: 'social' },
];

const CATEGORIES: { key: string; title: string; Icon: typeof Brain }[] = [
  { key: 'ai', title: 'Yapay Zeka (LLM)', Icon: Brain },
  { key: 'communication', title: 'Çağrı & SMS', Icon: PhoneCall },
  { key: 'tts', title: 'Seslendirme (TTS)', Icon: Music },
  { key: 'social', title: 'Sosyal Medya API', Icon: MessageCircle },
];

function maskValue(val: string): string {
  if (!val) return '';
  if (val.length <= 8) return '••••••••';
  return val.slice(0, 4) + '••••••••' + val.slice(-4);
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<Record<string, Record<string, unknown>>>({});
  const [editing, setEditing] = useState<Record<string, Record<string, string>>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const tid = getTenantId();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/api-keys/${tid}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const map: Record<string, Record<string, unknown>> = {};
        (data as Record<string, unknown>[]).forEach((k) => {
          map[String(k.provider)] = k;
        });
        setKeys(map);
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getFieldValue = (provider: string, field: string): string => {
    if (editing[provider]?.[field] !== undefined) return editing[provider][field];
    const row = keys[provider];
    if (!row) return '';
    if (field === 'api_key') return String(row.api_key || '');
    if (field === 'api_secret') return String(row.api_secret || '');
    const extra = (row.extra_config as Record<string, unknown>) || {};
    return String(extra[field] || '');
  };

  const setFieldValue = (provider: string, field: string, value: string) => {
    setEditing((prev) => ({
      ...prev,
      [provider]: { ...(prev[provider] || {}), [field]: value },
    }));
  };

  const buildSaveBody = (provider: string): Record<string, unknown> => {
    const fields = editing[provider] || {};
    const api_key = fields.api_key || null;
    const api_secret = fields.api_secret || null;
    const extra: Record<string, unknown> = {};
    Object.keys(fields).forEach((k) => {
      if (k !== 'api_key' && k !== 'api_secret' && fields[k]) {
        extra[k] = fields[k];
      }
    });
    // Merge with existing extra_config
    const existingExtra = (keys[provider]?.extra_config as Record<string, unknown>) || {};
    return { api_key, api_secret, label: PROVIDERS.find((p) => p.key === provider)?.label || provider, extra_config: { ...existingExtra, ...extra } };
  };

  const saveKey = async (provider: string) => {
    setSaving(provider);
    try {
      await fetch(`/api/api-keys/${tid}/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSaveBody(provider)),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setEditing((prev) => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
      load();
    } catch (e) { console.error(e); }
    setSaving(null);
  };

  const testKey = async (provider: string) => {
    setTesting(provider);
    try {
      const res = await fetch(`/api/api-keys/${tid}/${provider}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [provider]: data.status }));
    } catch {
      setTestResults((prev) => ({ ...prev, [provider]: 'error' }));
    }
    setTesting(null);
  };

  const getStatus = (provider: string): 'configured' | 'not_configured' | 'testing' | 'error' => {
    if (testing === provider) return 'testing';
    if (testResults[provider] === 'error') return 'error';
    if (testResults[provider] === 'configured') return 'configured';
    if (testResults[provider] === 'missing_key' || testResults[provider] === 'not_configured' || testResults[provider] === 'missing_credentials') return 'not_configured';
    const row = keys[provider];
    if (!row) return 'not_configured';
    if (provider === 'openai_tts') {
      const openaiRow = keys['openai'];
      return openaiRow?.api_key ? 'configured' : 'not_configured';
    }
    if (provider === 'netgsm' || provider === 'twilio') {
      return row.api_key && row.api_secret ? 'configured' : 'not_configured';
    }
    return row.api_key ? 'configured' : 'not_configured';
  };

  const statusBadge = (provider: string) => {
    const s = getStatus(provider);
    if (s === 'configured') return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">🟢 Tanımlı</span>;
    if (s === 'testing') return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">🔄 Test Ediliyor</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">⚪ Tanımlı Değil</span>;
  };

  const initEdit = (p: Provider) => {
    const vals: Record<string, string> = {};
    p.fields.forEach((f) => { vals[f.name] = getFieldValue(p.key, f.name); });
    setEditing((prev) => ({ ...prev, [p.key]: vals }));
  };

  return (
    <div className="p-4 md:p-6 space-y-5 w-full">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
              <Key size={16} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">API Anahtarları</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Servis API anahtarlarınızı yönetin ve test edin</p>
        </div>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300">✅ Kaydedildi</div>
      )}

      {CATEGORIES.map((cat) => {
        const providers = PROVIDERS.filter((p) => p.category === cat.key);
        if (providers.length === 0) return null;
        const CatIcon = cat.Icon;
        return (
          <div key={cat.key}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                <CatIcon size={16} className="text-white" />
              </div>
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">{cat.title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map((p) => {
                const isConfigured = getStatus(p.key) === 'configured';
                const showSecret = showSecrets[p.key] || false;

                if (p.isLinked) {
                  return (
                    <div key={p.key} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-700 transition space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{p.icon}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{p.label}</h3>
                            <p className="text-[11px] text-gray-400 dark:text-slate-500">{p.desc}</p>
                          </div>
                        </div>
                        {statusBadge(p.key)}
                      </div>
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg p-3">
                        <p className="text-xs text-indigo-700 dark:text-indigo-300">
                          ℹ️ Bu servis mevcut <strong>OpenAI</strong> API Key&apos;inizi kullanır. Ayrı bir key gerekmez.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={p.key} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-700 transition space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{p.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{p.label}</h3>
                          <p className="text-[11px] text-gray-400 dark:text-slate-500">{p.desc}</p>
                        </div>
                      </div>
                      {statusBadge(p.key)}
                    </div>

                    <div className="space-y-2">
                      {p.fields.map((field) => {
                        const val = getFieldValue(p.key, field.name);
                        const isSecret = field.name === 'api_key' || field.name === 'api_secret' || field.name === 'auth_token';
                        const hasValue = !!(editing[p.key] !== undefined ? val : keys[p.key]);
                        const isEditing = editing[p.key] !== undefined;

                        if (!isEditing && hasValue && isSecret) {
                          return (
                            <div key={field.name} className="relative">
                              <input
                                type={showSecret ? 'text' : 'password'}
                                value={showSecret ? val : maskValue(val)}
                                readOnly
                                onClick={() => initEdit(p)}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 text-gray-900 dark:text-white pr-8 cursor-pointer hover:border-indigo-300 transition-colors font-mono"
                              />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setShowSecrets({ ...showSecrets, [p.key]: !showSecret }); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                              >
                                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div key={field.name} className="relative">
                            <input
                              type={isSecret && !showSecret ? 'password' : 'text'}
                              value={val}
                              onChange={(e) => setFieldValue(p.key, field.name, e.target.value)}
                              onFocus={() => { if (!isEditing) initEdit(p); }}
                              placeholder={field.placeholder}
                              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white pr-8 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none transition-colors font-mono"
                            />
                            {isSecret && (
                              <button
                                type="button"
                                onClick={() => setShowSecrets({ ...showSecrets, [p.key]: !showSecret })}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                              >
                                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => testKey(p.key)}
                        disabled={testing === p.key}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testing === p.key ? 'animate-spin' : ''}`} /> Test Et
                      </button>
                      <button
                        onClick={() => saveKey(p.key)}
                        disabled={saving === p.key}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" /> {saving === p.key ? 'Kaydediliyor...' : 'Kaydet'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
