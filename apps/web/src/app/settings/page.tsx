'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    fetch(`/api/settings/${tid}`)
      .then(r => r.json())
      .then(d => { setSettings(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const update = async (key: string, value: unknown) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await fetch(`/api/settings/${tid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="p-6 text-center text-gray-400">Yukleniyor...</div>;
  if (!settings) return <div className="p-6 text-center text-gray-400">Ayarlar yuklenemedi</div>;

  const sections = [
    {
      title: 'AI Ayarlari',
      items: [
        { key: 'ai_style', label: 'Konusma Tarzi', type: 'select', options: ['resmi', 'samimi', 'yoresel'], value: settings.ai_style || 'yoresel' },
        { key: 'brand_voice', label: 'Marka Sesi', type: 'select', options: ['geleneksel', 'samimi', 'premium', 'kurumsal', 'yoresel'], value: settings.brand_voice || 'yoresel' },
        { key: 'greeting_style', label: 'Karsilama Stili', type: 'select', options: ['firma_ad', 'musteri_hizmetleri', 'sade', 'ai_asistani'], value: settings.greeting_style || 'firma_ad' },
      ],
    },
    {
      title: 'Calisma Saatleri',
      items: [
        { key: 'business_hours_enabled', label: 'Calisma Saati Kontrolu', type: 'toggle', value: settings.business_hours_enabled },
        { key: 'business_hours_start', label: 'Acilis Saati', type: 'text', value: settings.business_hours_start || '08:00' },
        { key: 'business_hours_end', label: 'Kapanis Saati', type: 'text', value: settings.business_hours_end || '18:30' },
      ],
    },
    {
      title: 'Bildirimler',
      items: [
        { key: 'whatsapp_group_enabled', label: 'WhatsApp Grubu', type: 'toggle', value: settings.whatsapp_group_enabled },
        { key: 'printer_enabled', label: 'Termal Yazici', type: 'toggle', value: settings.printer_enabled },
        { key: 'callback_enabled', label: 'Geri Arama', type: 'toggle', value: settings.callback_enabled },
      ],
    },
    {
      title: 'Odeme',
      items: [
        { key: 'iban_enabled', label: 'IBAN Havale', type: 'toggle', value: settings.iban_enabled },
        { key: 'payment_link_enabled', label: 'Odeme Linki', type: 'toggle', value: settings.payment_link_enabled },
      ],
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ayarlar</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Isletme tercihleri</p>
        </div>
        {saved && <span className="text-sm text-green-600 font-medium">? Kaydedildi</span>}
      </div>

      {sections.map((section) => (
        <div key={section.title} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{section.title}</h2>
          {section.items.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-slate-200">{item.label}</span>
              {item.type === 'toggle' ? (
                <button onClick={() => update(item.key, !item.value)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${item.value ? 'bg-blue-600' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${item.value ? 'left-5' : 'left-0.5'}`} />
                </button>
              ) : item.type === 'select' ? (
                <select value={String(item.value)} onChange={(e) => update(item.key, e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                  {(item as { options: string[] }).options.map((o: string) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={String(item.value)} onChange={(e) => update(item.key, e.target.value)}
                  className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
