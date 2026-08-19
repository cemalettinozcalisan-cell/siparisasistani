'use client';

import { getTenantId } from '@/lib/tenant';

import { useEffect, useState } from 'react';
import { PhoneCall, Instagram, MessageSquare, Globe, Printer, Save, Settings2, Copy, Check, Webhook, Volume2, Truck, RefreshCw, Star } from 'lucide-react';
import { WhatsAppIcon } from '@/components/channel-icons';
import Link from 'next/link';

const CHANNELS = [
  { key: 'whatsapp_enabled', provider: 'meta_whatsapp', label: 'WhatsApp', icon: WhatsAppIcon, desc: 'WhatsApp Business API ile sipariş alma', color: 'bg-emerald-500', ring: 'ring-emerald-500/20' },
  { key: 'instagram_enabled', provider: 'meta_instagram', label: 'Instagram DM', icon: Instagram, desc: 'Instagram Direct Message ile sipariş alma', color: 'bg-gradient-to-br from-pink-500 to-purple-600', ring: 'ring-pink-500/20' },
  { key: 'phone_enabled', provider: 'netgsm', label: 'Telefon (Voice AI)', icon: PhoneCall, desc: 'NetGSM üzerinden sesli arama ile sipariş', color: 'bg-blue-500', ring: 'ring-blue-500/20' },
  { key: 'sms_enabled', provider: 'netgsm', label: 'SMS Sipariş', icon: MessageSquare, desc: 'Kısa mesaj (SMS) ile sipariş alma', color: 'bg-orange-500', ring: 'ring-orange-500/20' },
  { key: 'voice_enabled', provider: 'elevenlabs', label: 'Yapay Ses (ElevenLabs)', icon: Volume2, desc: 'Doğal insan sesiyle müşterilerle konuşma', color: 'bg-violet-500', ring: 'ring-violet-500/20' },
  { key: 'website_enabled', provider: null, label: 'Web Sitesi', icon: Globe, desc: 'WooCommerce / Shopify / İdeasoft entegrasyonu', color: 'bg-sky-600', ring: 'ring-sky-500/20' },
];

const PRINTER_TYPES = [
  { value: 'thermal', label: 'Termal 58mm' },
  { value: 'thermal_80mm', label: 'Termal 80mm' },
  { value: 'a4', label: 'A4 PDF' },
];

export default function IntegrationsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, Record<string, unknown>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [testPrinting, setTestPrinting] = useState(false);
  const [testPrintResult, setTestPrintResult] = useState<string | null>(null);
  const [cargoInts, setCargoInts] = useState<Record<string, unknown>[]>([]);
  const [cargoEdit, setCargoEdit] = useState<Record<string, Record<string, unknown>>>({});
  const [testingCargo, setTestingCargo] = useState<string | null>(null);
  const [cargoTestResult, setCargoTestResult] = useState<Record<string, string>>({});
  const [origin, setOrigin] = useState('');
  const tid = getTenantId();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    fetch(`/api/settings/${tid}`).then((r) => r.json()).then((d) => setSettings(d)).catch(() => {});
    fetch(`/api/api-keys/${tid}`)
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, Record<string, unknown>> = {};
        if (Array.isArray(data)) {
          (data as Record<string, unknown>[]).forEach((k) => {
            map[String(k.provider)] = k;
          });
        }
        setApiKeys(map);
      })
      .catch(() => {});
    fetch(`/api/cargo/integrations/${tid}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCargoInts(data);
      })
      .catch(() => {});
  }, []);

  const hasApiKey = (provider: string | null): boolean => {
    if (!provider) return true;
    const row = apiKeys[provider];
    if (!row) return false;
    if (provider === 'netgsm') return !!(row.api_key && row.api_secret);
    return !!row.api_key;
  };

  const toggle = (key: string) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`/api/settings/${tid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const copyUrl = async (url: string, platform: string) => {
    const fullUrl = `${origin}${url}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(platform);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(platform);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const printTest = async () => {
    setTestPrinting(true);
    setTestPrintResult(null);
    try {
      const res = await fetch(`/api/print/test/${tid}`, { method: 'POST' });
      const data = await res.json();
      setTestPrintResult(data.success ? 'success' : 'error');
    } catch {
      setTestPrintResult('error');
    }
    setTestPrinting(false);
  };

  const printerType = String(settings.printer_type || 'thermal');
  const printerCopyCount = Number(settings.printer_copy_count || 1);

  const getCargoField = (company: string, field: string): string => {
    if (cargoEdit[company]?.[field] !== undefined) return String(cargoEdit[company][field] || '');
    const row = cargoInts.find((c) => c.company === company);
    if (!row) return '';
    if (field === 'api_key') return String(row.api_key || '');
    if (field === 'api_secret') return String(row.api_secret || '');
    return '';
  };

  const setCargoField = (company: string, field: string, value: string) => {
    setCargoEdit((prev) => ({ ...prev, [company]: { ...(prev[company] || {}), [field]: value } }));
  };

  const saveCargo = async (company: string) => {
    const edits = cargoEdit[company] || {};
    const body: Record<string, unknown> = {
      enabled: !!getCargoField(company, 'api_key') || !!edits.enabled,
      api_key: getCargoField(company, 'api_key'),
      api_secret: getCargoField(company, 'api_secret'),
    };
    if (!body.api_key) body.enabled = false;
    await fetch(`/api/cargo/integrations/${tid}/${company}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setCargoEdit((prev) => {
      const next = { ...prev };
      delete next[company];
      return next;
    });
    setCargoTestResult((prev) => {
      const next = { ...prev };
      delete next[company];
      return next;
    });
    const res = await fetch(`/api/cargo/integrations/${tid}`);
    const data = await res.json();
    if (Array.isArray(data)) setCargoInts(data);
  };

  const testCargo = async (company: string) => {
    setTestingCargo(company);
    setCargoTestResult((prev) => ({ ...prev, [company]: '' }));
    try {
      const res = await fetch(`/api/cargo/integrations/${tid}/${company}/test`, { method: 'POST' });
      const data = await res.json();
      setCargoTestResult((prev) => ({ ...prev, [company]: data.success ? 'success' : 'error' }));
    } catch {
      setCargoTestResult((prev) => ({ ...prev, [company]: 'error' }));
    }
    setTestingCargo(null);
  };

  const setDefaultCargo = async (company: string) => {
    await fetch(`/api/cargo/integrations/${tid}/${company}/default`, { method: 'POST' });
    const res = await fetch(`/api/cargo/integrations/${tid}`);
    const data = await res.json();
    if (Array.isArray(data)) setCargoInts(data);
  };

  const cargoFieldActive = (company: string): boolean => {
    const edits = cargoEdit[company];
    if (edits?.api_key !== undefined) return !!edits.api_key;
    return cargoInts.some((c) => c.company === company && !!c.api_key);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
              <Webhook size={16} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Entegrasyonlar</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Kanal ve yazıcı ayarlarını yönetin</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
        </button>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300">
          ✅ Ayarlar kaydedildi
        </div>
      )}

      {testPrintResult === 'success' && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300">
          🖨️ Test fişi başarıyla gönderildi
        </div>
      )}
      {testPrintResult === 'error' && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          🖨️ Test fişi gönderilemedi
        </div>
      )}

      {/* Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHANNELS.map((ch) => {
          const Icon = ch.icon;
          const enabled = !!settings[ch.key];
          const hasKey = hasApiKey(ch.provider);

          return (
            <div
              key={ch.key}
              className={`relative bg-white dark:bg-slate-800 rounded-xl border p-4 shadow-sm transition-all duration-200 ${
                enabled && hasKey
                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/5'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {/* API Key edit link */}
              {ch.provider && (
                <Link
                  href="/api-keys"
                  className="absolute top-3 right-3 flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                >
                  <Settings2 className="w-3 h-3" /> API Key&apos;i Düzenle
                </Link>
              )}

              {!hasKey && ch.provider && (
                <div className="mb-3 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  ⚠️ Önce API Key Tanımlayın
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${ch.color} flex items-center justify-center text-white`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{ch.label}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{ch.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => hasKey && toggle(ch.key)}
                  disabled={!hasKey}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                    !hasKey ? 'bg-slate-200 dark:bg-slate-700 cursor-not-allowed opacity-50' : enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled && hasKey ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-[11px]">
                <span className={`w-1.5 h-1.5 rounded-full ${enabled && hasKey ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300 dark:bg-slate-600'}`} />
                <span className={`font-medium ${enabled && hasKey ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-500'}`}>
                  {!hasKey && ch.provider ? 'API Key bekleniyor' : enabled ? 'Kanal Aktif ve Dinleniyor' : 'Pasif'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cargo Integrations */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Kargo Entegrasyonları</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Firma API anahtarlarıyla gönderim + otomatik takip. Şimdilik kalan firmalar "Hazırlanıyor".</p>
            </div>
          </div>
          <button
            onClick={async () => { const res = await fetch(`/api/cargo/integrations/${tid}`); const data = await res.json(); if (Array.isArray(data)) setCargoInts(data); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Yenile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cargoInts.map((firm) => {
            const company = String(firm.company);
            const label = String(firm.label);
            const hasKey = cargoFieldActive(company);
            const enabled = !!firm.enabled && hasKey;
            const testResult = cargoTestResult[company];
            return (
              <div key={company} className={`relative rounded-xl border p-4 transition-all ${enabled ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/5' : 'border-slate-200 dark:border-slate-700'}`}>
                {!!firm.is_default && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm">
                    ⭐ Varsayılan
                  </span>
                )}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${hasKey ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-800'} flex items-center justify-center`}>
                      <Truck className={`w-4 h-4 ${hasKey ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        {hasKey ? (enabled ? 'Aktif - otomatik takip açık' : 'API anahtarı kayıtlı (pasif)') : 'Entegrasyon tanımlı değil'}
                      </p>
                    </div>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300 dark:bg-slate-600'}`} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-gray-500 dark:text-slate-400 w-16 shrink-0">API Key</label>
                    <input
                      type="password"
                      value={getCargoField(company, 'api_key')}
                      onChange={(e) => setCargoField(company, 'api_key', e.target.value)}
                      placeholder="Kullanıcı adı / anahtar"
                      className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-blue-400 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-gray-500 dark:text-slate-400 w-16 shrink-0">Şifre</label>
                    <input
                      type="password"
                      value={getCargoField(company, 'api_secret')}
                      onChange={(e) => setCargoField(company, 'api_secret', e.target.value)}
                      placeholder="Şifre / secret"
                      className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-blue-400 outline-none"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => saveCargo(company)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-medium transition-all disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" /> Kaydet
                  </button>
                  <button
                    onClick={() => testCargo(company)}
                    disabled={testingCargo === company || !hasKey}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-40"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingCargo === company ? 'animate-spin' : ''}`} />
                    {testingCargo === company ? 'Test...' : 'Test'}
                  </button>
                  <button
                    onClick={() => setDefaultCargo(company)}
                    disabled={!!firm.is_default}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400 rounded-lg text-[11px] font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all disabled:opacity-40"
                  >
                    <Star className="w-3.5 h-3.5" />
                    {firm.is_default ? 'Varsayılan' : 'Varsayılan Yap'}
                  </button>
                  <a
                    href={String(firm.support_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto text-[11px] text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Takip sayfası
                  </a>
                </div>

                {testResult === 'success' && (
                  <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">✓ Bağlantı hazır</p>
                )}
                {testResult === 'error' && (
                  <p className="mt-2 text-[11px] text-red-500 dark:text-red-400">✗ Bağlantı kurulamadı</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Printer Panel */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-5 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Printer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Yazıcı Ayarları</h2>
        </div>

        {/* Printer type segmented */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400 block mb-2">Fiş Tipi</label>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg w-fit">
            {PRINTER_TYPES.map((pt) => (
              <button
                key={pt.value}
                onClick={() => setSettings((prev) => ({ ...prev, printer_type: pt.value }))}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  printerType === pt.value
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                }`}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Auto print toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Otomatik Fiş Yazdır</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Yeni sipariş geldiğinde anında yazdır</p>
          </div>
          <button
            onClick={() => toggle('printer_enabled')}
            className={`relative w-11 h-6 rounded-full transition-colors ${settings.printer_enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.printer_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Copy count */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Kopya Sayısı</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Her sipariş için yazdırılacak fiş adedi</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => setSettings((prev) => ({ ...prev, printer_copy_count: n }))}
                className={`w-8 h-7 rounded-md text-xs font-bold transition-all ${
                  printerCopyCount === n
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Test print button */}
        <div className="pt-1 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={printTest}
            disabled={testPrinting}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
          >
            <Printer className={`w-4 h-4 ${testPrinting ? 'animate-pulse' : ''}`} />
            {testPrinting ? 'Yazdırılıyor...' : 'Test Fişi Bas'}
          </button>
        </div>
      </div>

      {/* Webhook URLs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Webhook className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Webhook URL&apos;leri</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400">Web sitenizden siparişleri almak için aşağıdaki URL&apos;leri e-ticaret platformunuza ekleyin:</p>
        <div className="space-y-1.5">
          {[
            { platform: 'WooCommerce', url: `/api/webhook/woocommerce/${tid}` },
            { platform: 'Shopify', url: `/api/webhook/shopify/${tid}` },
            { platform: 'İdeasoft', url: `/api/webhook/ideasoft/${tid}` },
            { platform: 'Ticimax', url: `/api/webhook/ticimax/${tid}` },
            { platform: 'Özel Yazılım', url: `/api/webhook/custom/${tid}` },
          ].map((w) => (
            <div key={w.platform} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300 w-28 shrink-0">{w.platform}</span>
              <code className="flex-1 text-xs bg-slate-900 text-emerald-400 px-3 py-1.5 rounded-lg font-mono truncate mx-3 select-all">
                {origin}{w.url}
              </code>
              <button
                onClick={() => copyUrl(w.url, w.platform)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all shrink-0"
              >
                {copied === w.platform ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Kopyalandı
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Kopyala
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
