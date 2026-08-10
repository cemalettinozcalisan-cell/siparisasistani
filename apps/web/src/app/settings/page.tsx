'use client';

import { getTenantId } from '@/lib/tenant';

import { useEffect, useState } from 'react';
import { Save, Plus, X, Clock, Bell, CreditCard, MapPin, Truck, Brain, Package, Info, Check } from 'lucide-react';

const DAYS = [
  { key: 'monday', label: 'Pazartesi' },
  { key: 'tuesday', label: 'Salı' },
  { key: 'wednesday', label: 'Çarşamba' },
  { key: 'thursday', label: 'Perşembe' },
  { key: 'friday', label: 'Cuma' },
  { key: 'saturday', label: 'Cumartesi' },
  { key: 'sunday', label: 'Pazar' },
];

const defaultDay = { open: true, start: '08:00', end: '18:30' };

function parseDays(raw: unknown): Record<string, { open: boolean; start: string; end: string }> {
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const result: Record<string, { open: boolean; start: string; end: string }> = {};
    DAYS.forEach((d) => {
      const val = obj[d.key] as Record<string, unknown> | undefined;
      result[d.key] = {
        open: val?.open !== false,
        start: String(val?.start || defaultDay.start),
        end: String(val?.end || defaultDay.end),
      };
    });
    return result;
  }
  const r: Record<string, { open: boolean; start: string; end: string }> = {};
  DAYS.forEach((d) => { r[d.key] = { ...defaultDay }; });
  return r;
}

function parseStrList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  return [];
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [days, setDays] = useState<Record<string, { open: boolean; start: string; end: string }>>({});
  const [excludedRegions, setExcludedRegions] = useState<string[]>([]);
  const [regionInput, setRegionInput] = useState('');
  const [shippingCountries, setShippingCountries] = useState<string[]>([]);
  const [countryInput, setCountryInput] = useState('');
  const [deliveryRules, setDeliveryRules] = useState<string[]>([]);
  const [ruleInput, setRuleInput] = useState('');
  const tid = getTenantId();

  useEffect(() => {
    fetch(`/api/settings/${tid}`)
      .then((r) => r.json())
      .then((d) => {
        setSettings(d);
        setDays(parseDays(d.business_hours_data));
        setExcludedRegions(parseStrList(d.excluded_regions));
        setShippingCountries(parseStrList(d.shipping_countries));
        setDeliveryRules(parseStrList(d.delivery_rules));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const update = (key: string, value: unknown) => {
    if (!settings) return;
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const body = {
      ...settings,
      business_hours_data: days,
      excluded_regions: excludedRegions,
      shipping_countries: shippingCountries,
      delivery_rules: deliveryRules,
    };
    try {
      await fetch(`/api/settings/${tid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const saveAndKeep = async (key: string, value: unknown) => {
    update(key, value);
    if (!settings) return;
    setSaving(true);
    const body = {
      ...settings,
      [key]: value,
      business_hours_data: days,
      excluded_regions: excludedRegions,
      shipping_countries: shippingCountries,
      delivery_rules: deliveryRules,
    };
    try {
      await fetch(`/api/settings/${tid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {}
    setSaving(false);
  };

  const addItem = async (list: string[], setter: (v: string[]) => void, input: string, setInput: (v: string) => void, key: string) => {
    const trimmed = input.trim();
    if (!trimmed || list.includes(trimmed)) return;
    const next = [...list, trimmed];
    setter(next);
    setInput('');
    update(key, next);
  };

  const removeItem = async (list: string[], setter: (v: string[]) => void, index: number, key: string) => {
    const next = list.filter((_, i) => i !== index);
    setter(next);
    update(key, next);
  };

  if (loading) return <div className="p-6 text-center text-gray-400">Yükleniyor...</div>;
  if (!settings) return <div className="p-6 text-center text-gray-400">Ayarlar yüklenemedi</div>;

  const SectionHeader = ({ icon: Icon, title, gradient = 'from-indigo-500 to-violet-600' }: { icon: typeof Brain; title: string; gradient?: string }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}>
        <Icon size={17} className="text-white" />
      </div>
      <h2 className="font-bold text-sm text-slate-900 dark:text-white">{title}</h2>
    </div>
  );

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-10 h-5 rounded-full transition-all shrink-0 ${enabled ? 'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-sm' : 'bg-gray-300 dark:bg-slate-600'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );

  const CrudList = ({ items, inputValue, onInputChange, onAdd, onRemove, placeholder, addLabel }: {
    items: string[];
    inputValue: string;
    onInputChange: (v: string) => void;
    onAdd: () => void;
    onRemove: (i: number) => void;
    placeholder: string;
    addLabel: string;
  }) => (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); }}
          placeholder={placeholder}
          className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none"
        />
        <button onClick={onAdd} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> {addLabel}
        </button>
      </div>
      {items.length > 0 && (
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-gray-700 dark:text-slate-300 group">
              <span>{item}</span>
              <button onClick={() => onRemove(i)} className="text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Brain size={22} className="text-indigo-500" /> İşletme Ayarları
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">İşletme tercihlerinizi yönetin</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
        </button>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-xs">✓</span>
          Tüm ayarlar başarıyla kaydedildi
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: 'all', label: 'Tümü', icon: Package },
          { key: 'ai', label: 'AI & Davranış', icon: Brain },
          { key: 'hours', label: 'Çalışma Saatleri', icon: Clock },
          { key: 'payment', label: 'Ödeme & Kargo', icon: Truck },
          { key: 'invoice', label: 'Fatura & Vergi', icon: Clock },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${active ? 'text-white shadow-sm bg-gradient-to-r from-indigo-600 to-violet-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* 1. AI Ayarları — DOKUNULMAZ */}
      {activeTab === "all" || activeTab === "ai" ? (<>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <SectionHeader icon={Brain} gradient="from-violet-500 to-purple-600" title="AI Ayarları" />
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">Konuşma Tarzı</label>
          <div className="grid grid-cols-3 gap-2">
            {[{ value: 'samimi', label: 'Samimi', desc: 'Günlük, sıcak' }, { value: 'resmi', label: 'Resmi', desc: 'Profesyonel' }, { value: 'yoresel', label: 'Yöresel', desc: 'Esnaf ağzı' }].map((o: {value: string; label: string; desc: string}) => { const isActive = String(settings.ai_style || 'yoresel') === o.value; return (
              <button key={o.value} onClick={() => saveAndKeep('ai_style', o.value)} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${isActive ? 'border-2 border-indigo-600 bg-white dark:bg-slate-800 shadow-sm shadow-indigo-100 dark:shadow-indigo-900/20 relative' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-200'}`}>{isActive && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center shadow-sm"><Check size={10} className="text-white" /></span>}
                <span className={`text-xs font-bold ${isActive ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-900 dark:text-slate-200 font-semibold'}`}>{o.label}</span><span className="text-[10px] text-slate-400">{o.desc}</span>
              </button>); })}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">Marka Sesi</label>
          <div className="grid grid-cols-3 gap-2">
            {[{ value: 'geleneksel', label: 'Geleneksel', desc: 'Usta-çırak' }, { value: 'samimi', label: 'Samimi', desc: 'Sıcak kanlı' }, { value: 'premium', label: 'Premium', desc: 'Butik/lüks' }, { value: 'kurumsal', label: 'Kurumsal', desc: 'Resmi' }, { value: 'yoresel', label: 'Yöresel', desc: 'Yerel ağız' }].map((o: {value: string; label: string; desc: string}) => { const isActive = String(settings.brand_voice || 'yoresel') === o.value; return (
              <button key={o.value} onClick={() => saveAndKeep('brand_voice', o.value)} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${isActive ? 'border-2 border-indigo-600 bg-white dark:bg-slate-800 shadow-sm shadow-indigo-100 dark:shadow-indigo-900/20 relative' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-200'}`}>{isActive && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center shadow-sm"><Check size={10} className="text-white" /></span>}
                <span className={`text-xs font-bold ${isActive ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-900 dark:text-slate-200 font-semibold'}`}>{o.label}</span><span className="text-[10px] text-slate-400">{o.desc}</span>
              </button>); })}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">Karşılama Stili</label>
          <div className="grid grid-cols-2 gap-2">
            {[{ value: 'firma_ad', label: 'Firma Adı ile', desc: 'Firma ismiyle karşılar' }, { value: 'musteri_hizmetleri', label: 'Müşteri Hizmetleri', desc: 'Kurumsal karşılama' }, { value: 'sade', label: 'Sade', desc: 'Kısa ve net' }, { value: 'ai_asistani', label: 'AI Asistanı', desc: 'Yapay zeka vurgusu' }].map((o: {value: string; label: string; desc: string}) => { const isActive = String(settings.greeting_style || 'firma_ad') === o.value; return (
              <button key={o.value} onClick={() => saveAndKeep('greeting_style', o.value)} className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 transition-all ${isActive ? 'border-2 border-indigo-600 bg-white dark:bg-slate-800 shadow-sm shadow-indigo-100 dark:shadow-indigo-900/20 relative' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-200'}`}>{isActive && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center shadow-sm"><Check size={10} className="text-white" /></span>}
                <span className={`text-xs font-bold ${isActive ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-900 dark:text-slate-200 font-semibold'}`}>{o.label}</span><span className="text-[10px] text-slate-400">{o.desc}</span>
              </button>); })}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">AI Ses Cinsiyeti</label>
          <div className="grid grid-cols-3 gap-2">
            {[{ value: 'female', label: 'Kadın', desc: 'Yumuşak, sıcak' }, { value: 'male', label: 'Erkek', desc: 'Güvenilir, tok' }, { value: 'custom', label: 'Özel', desc: 'Manuel ses ID' }].map((o: {value: string; label: string; desc: string}) => { const isActive = String(settings.voice_gender || 'male') === o.value; return (
              <button key={o.value} onClick={() => saveAndKeep('voice_gender', o.value)} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${isActive ? 'border-2 border-indigo-600 bg-white dark:bg-slate-800 shadow-sm shadow-indigo-100 dark:shadow-indigo-900/20 relative' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-200'}`}>{isActive && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center shadow-sm"><Check size={10} className="text-white" /></span>}
                <span className={`text-xs font-bold ${isActive ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-900 dark:text-slate-200 font-semibold'}`}>{o.label}</span><span className="text-[10px] text-slate-400">{o.desc}</span>
              </button>); })}
          </div>
          {String(settings.voice_gender || 'male') === 'custom' && (
            <div className="mt-2"><input value={String(settings.custom_voice_id || '')} onChange={(e) => saveAndKeep('custom_voice_id', e.target.value)} placeholder="ElevenLabs Voice ID veya OpenAI ses adı" className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white" /></div>
          )}
        </div>
      </div>
      </>):null}

      {/* 2. Çalışma Saatleri */}
      {activeTab === "all" || activeTab === "hours" ? (<>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <SectionHeader icon={Clock} gradient="from-sky-500 to-blue-600" title="Çalışma Saatleri" />

        <Row label="Çalışma Saati Kontrolü" desc="Kapalıyken AI 7/24 sipariş alır, çalışma saatleri sadece bilgi amaçlıdır">
          <Toggle enabled={!!settings.business_hours_enabled} onChange={(v) => saveAndKeep('business_hours_enabled', v)} />
        </Row>

        {!!settings.business_hours_enabled && (
          <>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_60px_70px_80px] gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                <span>Gün</span>
                <span className="text-center">Açık</span>
                <span>Açılış</span>
                <span>Kapanış</span>
              </div>
              {DAYS.map((day) => {
                const d = days[day.key] || { ...defaultDay };
                return (
                  <div key={day.key} className="grid grid-cols-[1fr_60px_70px_80px] gap-2 px-4 py-2.5 border-t border-slate-100 dark:border-slate-700/50 items-center hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{day.label}</span>
                    <div className="flex justify-center">
                      <Toggle
                        enabled={d.open}
                        onChange={(v) => {
                          const next = { ...days, [day.key]: { ...d, open: v } };
                          setDays(next);
                          update('business_hours_data', next);
                        }}
                      />
                    </div>
                    <input
                      type="time"
                      value={d.start}
                      onChange={(e) => {
                        const next = { ...days, [day.key]: { ...d, start: e.target.value } };
                        setDays(next);
                        update('business_hours_data', next);
                      }}
                      disabled={!d.open}
                      className="px-2 py-1 border border-gray-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white disabled:opacity-40"
                    />
                    <input
                      type="time"
                      value={d.end}
                      onChange={(e) => {
                        const next = { ...days, [day.key]: { ...d, end: e.target.value } };
                        setDays(next);
                        update('business_hours_data', next);
                      }}
                      disabled={!d.open}
                      className="px-2 py-1 border border-gray-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white disabled:opacity-40"
                    />
                  </div>
                );
              })}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 block mb-1.5">Mesai Dışı AI Davranışı</label>
              <select
                value={String(settings.after_hours_behavior || 'hold_order')}
                onChange={(e) => saveAndKeep('after_hours_behavior', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              >
                <option value="hold_order">Siparişi al, mesai başlangıcında işleneceğini belirt</option>
                <option value="reject_order">Şu an kapalı olduğumuzu belirt ve sipariş alma</option>
              </select>
            </div>
          </>
        )}
      </div>
      </>):null}

      {/* 3. Bildirim Ayarları */}
      {activeTab === "all" || activeTab === "ai" ? (<>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <SectionHeader icon={Bell} gradient="from-amber-400 to-orange-500" title="Bildirimler" />

        <Row label="WhatsApp Grubu" desc="Yeni siparişleri WhatsApp grubuna bildir">
          <Toggle enabled={!!settings.whatsapp_group_enabled} onChange={(v) => saveAndKeep('whatsapp_group_enabled', v)} />
        </Row>
        {!!settings.whatsapp_group_enabled && (
          <div className="pl-2 border-l-2 border-indigo-200 dark:border-indigo-800">
            <input
              value={String(settings.whatsapp_group_id || '')}
              onChange={(e) => update('whatsapp_group_id', e.target.value)}
              placeholder="WhatsApp Grup ID / Davet Linki"
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none"
            />
          </div>
        )}

        <Row label="Yazıcı Sesli Uyarı (Bip)" desc="Fiş yazdırıldığında sesli bip sesi">
          <Toggle enabled={settings.printer_beep_enabled !== false} onChange={(v) => saveAndKeep('printer_beep_enabled', v)} />
        </Row>

        <Row label="Sesli / Pop-up Web Bildirimi" desc="Panel açıkken yeni sipariş geldiğinde tarayıcı bildirimi">
          <Toggle enabled={settings.web_notifications_enabled !== false} onChange={(v) => saveAndKeep('web_notifications_enabled', v)} />
        </Row>

        <div className="space-y-1">
          <label className="text-xs text-gray-500 dark:text-slate-400">Ödeme Hatırlatma Süresi (dk)</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min="5" max="120"
              value={Number(settings.payment_reminder_minutes) || 20}
              onChange={(e) => saveAndKeep('payment_reminder_minutes', Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white w-24"
            />
            <span className="text-xs text-gray-400">Ödeme yapılmazsa {Number(settings.payment_reminder_minutes) || 20} dk sonra müşteriye WhatsApp + SMS hatırlatması gönderilir</span>
          </div>
        </div>
      </div>
      </>):null}

      {/* 4. Ödeme Yöntemleri */}
      {activeTab === "all" || activeTab === "payment" ? (<>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <SectionHeader icon={CreditCard} gradient="from-emerald-500 to-green-600" title="Ödeme Yöntemleri" />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-sm text-gray-700 dark:text-slate-300">Kapıda Nakit Ödeme</span>
            <Toggle enabled={settings.cash_on_delivery_enabled !== false} onChange={(v) => saveAndKeep('cash_on_delivery_enabled', v)} />
          </div>
          <div className="space-y-1">
            <span className="text-sm text-gray-700 dark:text-slate-300">Kapıda Kredi Kartı</span>
            <Toggle enabled={!!settings.card_on_delivery_enabled} onChange={(v) => saveAndKeep('card_on_delivery_enabled', v)} />
          </div>
        </div>

        <Row label="IBAN Havale / EFT">
          <Toggle enabled={!!settings.iban_enabled} onChange={(v) => saveAndKeep('iban_enabled', v)} />
        </Row>
        {!!settings.iban_enabled && (
          <div className="pl-2 border-l-2 border-indigo-200 dark:border-indigo-800 space-y-2">
            <input
              value={String(settings.bank_name || '')}
              onChange={(e) => update('bank_name', e.target.value)}
              placeholder="Banka Adı (örn: Ziraat Bankası)"
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none"
            />
            <input
              value={String(settings.recipient_name || '')}
              onChange={(e) => update('recipient_name', e.target.value)}
              placeholder="Alıcı Ad Soyad / Ünvan (örn: XYZ Gıda A.Ş.)"
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none"
            />
            <input
              value={String(settings.iban_number || '')}
              onChange={(e) => update('iban_number', e.target.value)}
              placeholder="IBAN Numarası (TR...)"
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none"
            />
          </div>
        )}

        <Row label="Minimum Sipariş Limiti (TL)" desc="Bu tutarın altındaki siparişlerde AI müşteriyi nazikçe uyarır">
          <input
            type="number"
            value={String(settings.min_order_amount || 0)}
            onChange={(e) => update('min_order_amount', Number(e.target.value))}
            placeholder="0"
            className="w-28 px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none"
          />
        </Row>
      </div>
      </>):null}

      {/* 5. Teslimat Bölgeleri */}
      {activeTab === "all" || activeTab === "hours" ? (<>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <SectionHeader icon={MapPin} gradient="from-teal-500 to-cyan-600" title="Teslimat Bölgeleri & Ülke Yönetimi" />

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-2">Gönderim Yapılmayan Bölgeler</label>
          <CrudList
            items={excludedRegions}
            inputValue={regionInput}
            onInputChange={setRegionInput}
            onAdd={() => addItem(excludedRegions, setExcludedRegions, regionInput, setRegionInput, 'excluded_regions')}
            onRemove={(i) => removeItem(excludedRegions, setExcludedRegions, i, 'excluded_regions')}
            placeholder="İl / İlçe (örn: Adalar / İstanbul)"
            addLabel="Ekle"
          />
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
          <Row label="Yurtdışı Gönderim Yapılıyor mu?">
            <Toggle enabled={!!settings.international_shipping_enabled} onChange={(v) => saveAndKeep('international_shipping_enabled', v)} />
          </Row>
          {!!settings.international_shipping_enabled && (
            <div className="mt-3 pl-2 border-l-2 border-indigo-200 dark:border-indigo-800">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-2">Gönderim Yapılan Ülkeler</label>
              <CrudList
                items={shippingCountries}
                inputValue={countryInput}
                onInputChange={setCountryInput}
                onAdd={() => addItem(shippingCountries, setShippingCountries, countryInput, setCountryInput, 'shipping_countries')}
                onRemove={(i) => removeItem(shippingCountries, setShippingCountries, i, 'shipping_countries')}
                placeholder="Ülke adı (örn: Almanya)"
                addLabel="Ekle"
              />
            </div>
          )}
        </div>
      </div>
      </>):null}

      {/* 6. Sipariş & Kargo Süreçleri */}
      {activeTab === "all" || activeTab === "hours" ? (<>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <SectionHeader icon={Truck} gradient="from-indigo-500 to-blue-600" title="Sipariş & Kargo Süreçleri" />

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1.5">Şehir İçi Teslimat Süresi</label>
          <input
            value={String(settings.city_delivery_time || '')}
            onChange={(e) => update('city_delivery_time', e.target.value)}
            placeholder="Şehir içi kurye ile 2-3 saat içinde teslim edilir"
            className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1.5">Şehir Dışı Kargo Hazırlık Süresi</label>
          <input
            value={String(settings.intercity_cargo_time || '')}
            onChange={(e) => update('intercity_cargo_time', e.target.value)}
            placeholder="Siparişler 1-2 iş günü içinde kargoya verilir"
            className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-2">Özel Kargo / Teslimat Kuralları</label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={ruleInput}
                onChange={(e) => setRuleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const trimmed = ruleInput.trim();
                    if (trimmed && !deliveryRules.includes(trimmed)) {
                      const next = [...deliveryRules, trimmed];
                      setDeliveryRules(next); setRuleInput('');
                      saveAndKeep('delivery_rules', next);
                    }
                  }
                }}
                placeholder="Hafta sonu verilen şehir dışı siparişler Pazartesi kargoya verilir"
                className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none"
              />
              <button
                onClick={() => {
                  const trimmed = ruleInput.trim();
                  if (trimmed && !deliveryRules.includes(trimmed)) {
                    const next = [...deliveryRules, trimmed];
                    setDeliveryRules(next); setRuleInput('');
                    saveAndKeep('delivery_rules', next);
                  }
                }}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Ekle
              </button>
            </div>
            {deliveryRules.length > 0 && (
              <div className="space-y-1">
                {deliveryRules.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-gray-700 dark:text-slate-300 group">
                    <span>{item}</span>
                    <button
                      onClick={() => {
                        const next = deliveryRules.filter((_, idx) => idx !== i);
                        setDeliveryRules(next);
                        saveAndKeep('delivery_rules', next);
                      }}
                      className="text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </>):null}

      {/* 7. Kargo Ayarları */}
      {activeTab === "all" || activeTab === "payment" ? (<>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <SectionHeader icon={Package} gradient="from-amber-500 to-orange-600" title="Kargo Ayarları" />

        <div className="space-y-4">
          {/* Ücretsiz Kargo */}
          <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <Row label="Ücretsiz Kargo" desc="Belirli şartlar üzeri siparişlerde kargo ücreti alınmaz">
              <Toggle enabled={!!settings?.cargo_free_enabled} onChange={(v) => saveAndKeep('cargo_free_enabled', v)} />
            </Row>
            {!!settings?.cargo_free_enabled && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Eşik Türü</label>
                  <select
                    value={String(settings?.cargo_free_type || 'amount')}
                    onChange={(e) => saveAndKeep('cargo_free_type', e.target.value)}
                    className="px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                    <option value="amount">Tutar (TL)</option>
                    <option value="weight">Ağırlık (KG)</option>
                    <option value="quantity">Adet / Koli / Palet</option>
                  </select>
                </div>

                {String(settings?.cargo_free_type || 'amount') === 'amount' && (
                  <div>
                    <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Ücretsiz kargo eşik tutarı (TL)</label>
                    <input
                      type="number"
                      value={Number(settings?.cargo_free_threshold) || 0}
                      onChange={(e) => saveAndKeep('cargo_free_threshold', Number(e.target.value))}
                      className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white w-40"
                      placeholder="örn: 500"
                    />
                    <span className="text-xs text-gray-400 ml-2">{Number(settings?.cargo_free_threshold) || 500} TL ve üzeri ücretsiz</span>
                  </div>
                )}

                {String(settings?.cargo_free_type || 'amount') === 'weight' && (
                  <div>
                    <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Ücretsiz kargo ağırlık eşiği (KG)</label>
                    <input
                      type="number"
                      value={Number(settings?.cargo_free_weight) || 0}
                      onChange={(e) => saveAndKeep('cargo_free_weight', Number(e.target.value))}
                      className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white w-40"
                      placeholder="örn: 10"
                    />
                    <span className="text-xs text-gray-400 ml-2">{Number(settings?.cargo_free_weight) || 10} KG ve üzeri ücretsiz</span>
                  </div>
                )}

                {String(settings?.cargo_free_type || 'amount') === 'quantity' && (
                  <div>
                    <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Ücretsiz kargo adet eşiği (Koli/Palet/Adet)</label>
                    <input
                      type="number"
                      value={Number(settings?.cargo_free_quantity) || 0}
                      onChange={(e) => saveAndKeep('cargo_free_quantity', Number(e.target.value))}
                      className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white w-40"
                      placeholder="örn: 5"
                    />
                    <span className="text-xs text-gray-400 ml-2">{Number(settings?.cargo_free_quantity) || 5} adet/koli/palet ve üzeri ücretsiz</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Kapıda Ödeme */}
          <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <Row label="Kapıda Ödeme" desc="Kargo ile kapıda nakit veya kart tahsilatı">
              <Toggle enabled={!!settings?.cargo_cod_enabled} onChange={(v) => saveAndKeep('cargo_cod_enabled', v)} />
            </Row>
            {!!settings?.cargo_cod_enabled && (
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Kapıda ödeme ek ücreti (TL)</label>
                <input
                  type="number"
                  value={Number(settings?.cargo_cod_fee) || 0}
                  onChange={(e) => saveAndKeep('cargo_cod_fee', Number(e.target.value))}
                  className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white w-40"
                  placeholder="örn: 10"
                />
                <span className="text-xs text-gray-400 ml-2">Kapıda ödemede müşteriden +{Number(settings?.cargo_cod_fee) || 10} TL alınır</span>
              </div>
            )}
          </div>

          {/* Varsayılan Kargo Ücreti */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Varsayılan kargo ücreti (TL)</label>
            <input
              type="number"
              value={Number(settings?.cargo_default_price) || 0}
              onChange={(e) => saveAndKeep('cargo_default_price', Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white w-40"
              placeholder="örn: 60"
            />
            <span className="text-xs text-gray-400 ml-2">Hiçbir kargo firması seçili değilse bu ücret kullanılır</span>
          </div>

          {/* Kargo Firmaları */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-3">
            <div className="flex items-start gap-2 mb-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
              <Info size={14} className="text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">Aktif ettiğiniz kargo firmaları ve ücretler AI tarafından müşteriye iletilir. Sipariş detayında manuel takip kodu girmenizi sağlar.</p>
            </div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-200">Kargo Firmaları</label>
            {[
              { key: 'yurtici', label: 'Yurtiçi Kargo' },
              { key: 'mng', label: 'MNG Kargo' },
              { key: 'aras', label: 'Aras Kargo' },
              { key: 'surat', label: 'Sürat Kargo' },
              { key: 'ptt', label: 'PTT Kargo' },
              { key: 'trendyol', label: 'Trendyol Express' },
              { key: 'dhl', label: 'DHL Express' },
            ].map((firm) => (
              <div key={firm.key} className={`flex items-center gap-3 ${settings?.[`${firm.key}_enabled`] ? '' : 'opacity-50'}`}>
                <span className="text-sm text-gray-600 dark:text-slate-300 w-32">{firm.label}</span>
                <Toggle enabled={!!settings?.[`${firm.key}_enabled`]} onChange={(v) => saveAndKeep(`${firm.key}_enabled`, v)} />
                {!!settings?.[`${firm.key}_enabled`] && (<>
                  <input type="number" value={Number(settings?.[`${firm.key}_price`]) || 0}
                    onChange={(e) => saveAndKeep(`${firm.key}_price`, Number(e.target.value))}
                    className="px-2 py-1 border border-gray-200 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white w-24" placeholder="Ücret" />
                  <span className="text-xs text-gray-400">TL</span>
                </>)}
              </div>
            ))}
          </div>
        </div>
      </div>
      </>):null}

      {/* 8. Fatura & Vergi Ayarları */}
      {activeTab === "all" || activeTab === "invoice" ? (<>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <SectionHeader icon={CreditCard} gradient="from-rose-500 to-pink-600" title="Fatura & Vergi Ayarları" />

        {/* Status Card */}
        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg grid grid-cols-3 gap-3 text-center text-xs">
          <div>
            <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${settings?.invoice_enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <div className="text-gray-500">e-Belge</div>
            <div className={`font-semibold ${settings?.invoice_enabled ? 'text-emerald-600' : 'text-slate-400'}`}>{settings?.invoice_enabled ? 'Aktif' : 'Pasif'}</div>
          </div>
          <div>
            <div className="w-3 h-3 rounded-full mx-auto mb-1 bg-slate-300" />
            <div className="text-gray-500">Entegratör</div>
            <div className="font-semibold text-slate-400">Bağlı Değil</div>
          </div>
          <div>
            <div className="w-3 h-3 rounded-full mx-auto mb-1 bg-slate-300" />
            <div className="text-gray-500">Ortam</div>
            <div className="font-semibold text-slate-400">—</div>
          </div>
        </div>

        {/* Main Toggle */}
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <Row label="e-Fatura / e-Arşiv Entegrasyonu" desc="Aktif edildiğinde vergi kuralları ve fatura bilgisi toplama özellikleri açılır">
              <Toggle enabled={!!settings?.invoice_enabled} onChange={(v) => saveAndKeep('invoice_enabled', v)} />
            </Row>
          </div>

          {!!settings?.invoice_enabled && (
            <div className="space-y-4">
              {/* Vergi Kuralları */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-slate-200">Vergi Kuralları</label>

                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Zorunlu Fatura Limiti (TL)</label>
                  <input
                    type="number"
                    value={Number(settings?.invoice_limit) || 12000}
                    onChange={(e) => saveAndKeep('invoice_limit', Number(e.target.value))}
                    className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white w-44"
                  />
                  <span className="text-xs text-gray-400 ml-2">{Number(settings?.invoice_limit || 12000).toLocaleString('tr-TR')} TL üzeri siparişlerde fatura zorunlu</span>
                </div>

                <Row label="Limit Aşımında Otomatik e-Arşiv Taslağı" desc="Limit aşıldığında siparişe otomatik fatura bayrağı eklenir">
                  <Toggle enabled={!!settings?.invoice_limit_auto} onChange={(v) => saveAndKeep('invoice_limit_auto', v)} />
                </Row>

                <Row label="Uzaktan/Kargo Satışlarda Otomatik e-Arşiv" desc="Kargo ile gönderilen tüm siparişlere fatura zorunluluğu">
                  <Toggle enabled={!!settings?.invoice_remote_auto} onChange={(v) => saveAndKeep('invoice_remote_auto', v)} />
                </Row>

                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Varsayılan KDV Oranı (%)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0" max="100" step="0.5"
                      value={Number(settings?.invoice_default_vat) || 20}
                      onChange={(e) => saveAndKeep('invoice_default_vat', Number(e.target.value))}
                      className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white w-28"
                    />
                    <div className="flex gap-1">
                      {[1, 8, 10, 18, 20].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => saveAndKeep('invoice_default_vat', rate)}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                            Number(settings?.invoice_default_vat || 20) === rate
                              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-600 hover:bg-slate-50'
                          }`}>
                          %{rate}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Fatura Alt Bilgisi / Not</label>
                  <textarea
                    value={String(settings?.invoice_footer_note || '')}
                    onChange={(e) => saveAndKeep('invoice_footer_note', e.target.value)}
                    placeholder='İnternet satışı teslimat belgesidir. Afyon Vergi Dairesi VKN 1234567890'
                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none resize-none"
                    rows={2}
                  />
                </div>
              </div>

              {/* Kimlik Bilgisi Politikası */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-slate-200">Kimlik Bilgisi Politikası</label>

                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Bireysel Müşteri TCKN Politikası</label>
                  <select
                    value={String(settings?.invoice_tc_policy || 'optional')}
                    onChange={(e) => saveAndKeep('invoice_tc_policy', e.target.value)}
                    className="px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white w-full">
                    <option value="optional">Opsiyonel — Müşteri verirse kaydet, vermezse Nihai Tüketici olarak işle</option>
                    <option value="required">Zorunlu — AI sipariş alırken TCKN istemek zorundadır</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">AI Fatura Davranışı</label>
                  <select
                    value={String(settings?.invoice_ai_behavior || 'end')}
                    onChange={(e) => saveAndKeep('invoice_ai_behavior', e.target.value)}
                    className="px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white w-full">
                    <option value="never">Hiç sorma — Fatura sürecine AI karışmaz</option>
                    <option value="end">Sipariş sonunda sor — Veda aşamasında fatura bilgisi topla</option>
                    <option value="required_only">Sadece gerekiyorsa sor — Limit aşıldıysa veya uzaktan satışsa sor</option>
                    <option value="always">Her siparişte sor — Sipariş başında fatura bilgisi topla</option>
                  </select>
                </div>

                <Row label="Kurumsal Müşteri Zorunlu Alanları" desc="Şirket siparişlerinde Vergi No, Vergi Dairesi ve Unvan zorunlu olarak toplanır">
                  <Toggle enabled={!!settings?.invoice_company_required} onChange={(v) => saveAndKeep('invoice_company_required', v)} />
                </Row>
              </div>
            </div>
          )}
        </div>
      </div>
      </>):null}

      {/* Bottom save */}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md disabled:opacity-50 text-white ${
            saved ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'
          }`}
        >
          {saving ? (
            <>Kaydediliyor...</>
          ) : saved ? (
            <>✓ Kaydedildi</>
          ) : (
            <><Save className="w-4 h-4" /> Tümünü Kaydet</>
          )}
        </button>
      </div>
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{label}</p>
        {desc && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}
