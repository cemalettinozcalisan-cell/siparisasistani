'use client';

import { useEffect, useState } from 'react';
import { PhoneCall, MessageCircle, Camera, Globe, Printer, Save, Webhook } from 'lucide-react';

const INTEGRATIONS = [
  { key: 'whatsapp_enabled', label: 'WhatsApp', icon: MessageCircle, desc: 'WhatsApp Business API ile sipariş alma', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { key: 'instagram_enabled', label: 'Instagram DM', icon: Camera, desc: 'Instagram Direct Message ile sipariş alma', color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  { key: 'phone_enabled', label: 'Telefon (Voice AI)', icon: PhoneCall, desc: 'NetGSM üzerinden sesli arama ile sipariş alma', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { key: 'website_enabled', label: 'Web Sitesi', icon: Globe, desc: 'WooCommerce / Shopify / Ideasoft entegrasyonu', color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/20' },
];

const PRINTER_TYPES = [
  { value: 'thermal', label: 'Termal (ESC/POS) 58mm' },
  { value: 'a4', label: 'A4 PDF' },
];

export default function IntegrationsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    fetch(`/api/settings/${tid}`).then(r => r.json()).then(d => setSettings(d)).catch(() => {});
  }, []);

  const toggle = (key: string) => {
    setSettings({ ...settings, [key]: !settings[key] });
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
    } catch {}
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Entegrasyonlar</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Kanal ve yazıcı ayarlarını yönetin</p>
        </div>
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300">
          ✅ Ayarlar kaydedildi
        </div>
      )}

      {/* Channel Toggles */}
      <div className="grid grid-cols-2 gap-4">
        {INTEGRATIONS.map((int) => {
          const Icon = int.icon;
          const enabled = settings[int.key] as boolean;
          return (
            <div key={int.key} className={`rounded-xl border-2 p-4 transition-all duration-200 ${enabled ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${int.bg} flex items-center justify-center ${int.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{int.label}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{int.desc}</p>
                  </div>
                </div>
                <button onClick={() => toggle(int.key)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Printer Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Yazıcı Ayarları</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Yazıcı Aktif</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Yeni siparişte otomatik yazdır</p>
          </div>
          <button onClick={() => toggle('printer_enabled')}
            className={`relative w-11 h-6 rounded-full transition-colors ${settings.printer_enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.printer_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {Boolean(settings.printer_enabled) && (
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white block mb-2">Yazıcı Tipi</label>
            <div className="flex gap-2">
              {PRINTER_TYPES.map((p) => (
                <button key={p.value} onClick={() => setSettings({ ...settings, printer_type: p.value })}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all border-2 ${settings.printer_type === p.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-gray-300'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Webhook Info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Webhook className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Webhook URL'leri</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400">Web sitenizden siparişleri almak için aşağıdaki URL'leri kullanın:</p>
        <div className="space-y-2">
          {[
            { platform: 'WooCommerce', url: `/api/webhook/woocommerce/${tid}` },
            { platform: 'Shopify', url: `/api/webhook/shopify/${tid}` },
            { platform: 'İdeasoft', url: `/api/webhook/ideasoft/${tid}` },
            { platform: 'Ticimax', url: `/api/webhook/ticimax/${tid}` },
            { platform: 'Özel Yazılım', url: `/api/webhook/custom/${tid}` },
          ].map((w) => (
            <div key={w.platform} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-gray-700 dark:text-slate-300">{w.platform}</span>
              <code className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-mono">{w.url}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
