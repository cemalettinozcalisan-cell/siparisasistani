'use client';

import { useEffect, useState } from 'react';
import { Save, Plus, X, Clock, Bell, CreditCard, MapPin, Truck, Brain, Package } from 'lucide-react';

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
  const [days, setDays] = useState<Record<string, { open: boolean; start: string; end: string }>>({});
  const [excludedRegions, setExcludedRegions] = useState<string[]>([]);
  const [regionInput, setRegionInput] = useState('');
  const [shippingCountries, setShippingCountries] = useState<string[]>([]);
  const [countryInput, setCountryInput] = useState('');
  const [deliveryRules, setDeliveryRules] = useState<string[]>([]);
  const [ruleInput, setRuleInput] = useState('');
  const tid = '00000000-0000-0000-0000-000000000001';

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

  const SectionHeader = ({ icon: Icon, title }: { icon: typeof Brain; title: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
        <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
    </div>
  );

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}
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
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">İşletme Ayarları</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">İşletme tercihlerinizi yönetin</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
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

      {/* 1. AI Ayarları — DOKUNULMAZ */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <SectionHeader icon={Brain} title="AI Ayarları" />
        <Row label="Konuşma Tarzı">
          <select value={String(settings.ai_style || 'yoresel')} onChange={(e) => saveAndKeep('ai_style', e.target.value)}
            className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
            <option value="resmi">Resmi</option>
            <option value="samimi">Samimi</option>
            <option value="yoresel">Yöresel</option>
          </select>
        </Row>
        <Row label="Marka Sesi">
          <select value={String(settings.brand_voice || 'yoresel')} onChange={(e) => saveAndKeep('brand_voice', e.target.value)}
            className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
            <option value="geleneksel">Geleneksel</option>
            <option value="samimi">Samimi</option>
            <option value="premium">Premium</option>
            <option value="kurumsal">Kurumsal</option>
            <option value="yoresel">Yöresel</option>
          </select>
        </Row>
        <Row label="Karşılama Stili">
          <select value={String(settings.greeting_style || 'firma_ad')} onChange={(e) => saveAndKeep('greeting_style', e.target.value)}
            className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
            <option value="firma_ad">Firma Adı</option>
            <option value="musteri_hizmetleri">Müşteri Hizmetleri</option>
            <option value="sade">Sade</option>
            <option value="ai_asistani">AI Asistanı</option>
          </select>
        </Row>
      </div>

      {/* 2. Çalışma Saatleri */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <SectionHeader icon={Clock} title="Çalışma Saatleri" />

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

      {/* 3. Bildirim Ayarları */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <SectionHeader icon={Bell} title="Bildirimler" />

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
      </div>

      {/* 4. Ödeme Yöntemleri */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <SectionHeader icon={CreditCard} title="Ödeme Yöntemleri" />

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

      {/* 5. Teslimat Bölgeleri */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <SectionHeader icon={MapPin} title="Teslimat Bölgeleri & Ülke Yönetimi" />

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

      {/* 6. Sipariş & Kargo Süreçleri */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <SectionHeader icon={Truck} title="Sipariş & Kargo Süreçleri" />

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

      {/* 7. Kargo Ayarları */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <SectionHeader icon={Package} title="Kargo Ayarları" />

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
            <label className="text-sm font-medium text-gray-700 dark:text-slate-200">Kargo Firmaları</label>
            {['yurtici', 'mng', 'aras'].map((firm) => (
              <div key={firm} className={`flex items-center gap-3 ${settings?.[`${firm}_enabled`] ? '' : 'opacity-50'}`}>
                <span className="text-sm text-gray-600 dark:text-slate-300 w-32 capitalize">{firm === 'yurtici' ? 'Yurtiçi Kargo' : firm === 'mng' ? 'MNG Kargo' : 'Aras Kargo'}</span>
                <Toggle enabled={!!settings?.[`${firm}_enabled`]} onChange={(v) => saveAndKeep(`${firm}_enabled`, v)} />
                {!!settings?.[`${firm}_enabled`] && (
                  <>
                    <input
                      type="number"
                      value={Number(settings?.[`${firm}_price`]) || 0}
                      onChange={(e) => saveAndKeep(`${firm}_price`, Number(e.target.value))}
                      className="px-2 py-1 border border-gray-200 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white w-24"
                      placeholder="Ücret"
                    />
                    <span className="text-xs text-gray-400">TL</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 8. Fatura & Vergi Ayarları */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <SectionHeader icon={CreditCard} title="Fatura & Vergi Ayarları" />

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
                  <select
                    value={String(settings?.invoice_default_vat || '20')}
                    onChange={(e) => saveAndKeep('invoice_default_vat', Number(e.target.value))}
                    className="px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                    <option value="1">%1</option>
                    <option value="10">%10</option>
                    <option value="20">%20</option>
                  </select>
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

      {/* Bottom save */}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg disabled:opacity-50 ${
            saved ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
          } text-white`}
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
