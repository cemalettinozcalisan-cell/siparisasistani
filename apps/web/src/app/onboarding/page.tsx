'use client';

import { useState } from 'react';
import { ArrowRight, ArrowLeft, Check, Sparkles, User, Building2, Bot, Package, Store, Flame, Gift, ChefHat, ShoppingBag } from 'lucide-react';

const SECTORS = [
  { key: 'sucuk', label: 'Sucuk & Et', icon: Flame, gradient: 'from-red-500 to-rose-600', desc: 'Kangal, vakumlu, parmak sucuk' },
  { key: 'lokum', label: 'Lokum & Şekerleme', icon: Gift, gradient: 'from-purple-500 to-pink-500', desc: 'Hediyelik kutu, özel gün' },
  { key: 'bukme', label: 'Bükme & Fırın', icon: ChefHat, gradient: 'from-amber-500 to-orange-600', desc: 'Günlük taze üretim' },
  { key: 'yumurta', label: 'Yumurta', icon: ShoppingBag, gradient: 'from-yellow-500 to-amber-500', desc: 'Koli, toptan, perakende' },
  { key: 'genel', label: 'Genel Ticaret', icon: Store, gradient: 'from-blue-500 to-indigo-600', desc: 'Diğer ürün/hizmet' },
];

const STEPS = ['Hesap Oluştur', 'İşletme Profili', 'AI Ayarları', 'Hızlı Kurulum', 'Onayla'];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({
    ownerName: '', ownerEmail: '', ownerPassword: '', phone: '',
    companyName: '', sector: 'sucuk', city: '', address: '', identityNumber: '', taxOffice: '',
    voiceGender: 'male', brandVoice: 'yoresel', greetingStyle: 'firma_ad',
    cargoCompanies: ['yurtici'] as string[], iban: '', loadDemoData: true, businessHoursEnabled: false,
  });

  const update = (key: string, value: unknown) => setForm({ ...form, [key]: value });

  const toggleCargo = (co: string) => {
    const list = form.cargoCompanies.includes(co) ? form.cargoCompanies.filter(c => c !== co) : [...form.cargoCompanies, co];
    setForm({ ...form, cargoCompanies: list });
  };

  const submit = async () => {
    setLoading(true);
    const res = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-5 border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg"><Check size={32} className="text-white" /></div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kurulum Tamamlandı!</h1>
          <div className="space-y-2 text-left bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-sm text-emerald-800 dark:text-emerald-300">
            {['Firma oluşturuldu', 'Yönetici hesabı oluşturuldu', 'AI hazır', 'Varsayılan ayarlar yüklendi', form.loadDemoData ? 'Demo ürünler eklendi' : null].filter(Boolean).map((msg, i) => (
              <div key={i} className="flex items-center gap-2"><Check size={14} /> {msg}</div>
            ))}
          </div>
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-xs text-slate-600 dark:text-slate-300">
            <p>E-posta: <strong>{result.ownerEmail as string}</strong></p>
          </div>
          <a href="/login" className="block w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md">Panele Git</a>
        </div>
      </div>
    );
  }

  const Step0 = () => (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md mb-3"><User size={22} className="text-white" /></div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Hesap Oluştur</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Panele giriş yapacağınız bilgiler</p>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Ad Soyad</label>
        <input value={form.ownerName} onChange={e => update('ownerName', e.target.value)} placeholder="Ahmet Yılmaz" className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">E-posta</label>
        <input type="email" value={form.ownerEmail} onChange={e => update('ownerEmail', e.target.value)} placeholder="ahmet@firma.com" className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Telefon</label>
        <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="05321234567" className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Şifre</label>
        <input type="password" value={form.ownerPassword} onChange={e => update('ownerPassword', e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" />
      </div>
    </div>
  );

  const Step1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md mb-3"><Building2 size={22} className="text-white" /></div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">İşletme Profili</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Firmanızı ve sektörünüzü seçin</p>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Firma Adı</label>
        <input value={form.companyName} onChange={e => update('companyName', e.target.value)} placeholder="Öz Afyon Lokumları" className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Sektör</label>
        <div className="grid grid-cols-3 gap-2">
          {SECTORS.map(s => { const Icon = s.icon; const active = form.sector === s.key; return (
            <button key={s.key} onClick={() => update('sector', s.key)} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${active ? `border-transparent bg-gradient-to-br ${s.gradient} text-white shadow-md` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-200'}`}>
              <Icon size={20} /><span className="text-[10px] font-semibold">{s.label}</span><span className="text-[8px] opacity-70">{s.desc}</span>
            </button>
          )})}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Şehir</label><input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Afyonkarahisar" className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" /></div>
        <div><label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Vergi Dairesi</label><input value={form.taxOffice} onChange={e => update('taxOffice', e.target.value)} placeholder="Opsiyonel" className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" /></div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Adres</label>
        <textarea value={form.address} onChange={e => update('address', e.target.value)} placeholder="İşletme adresiniz" rows={2} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none resize-none" />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">TCKN / Vergi No</label>
        <input value={form.identityNumber} onChange={e => update('identityNumber', e.target.value)} placeholder="11 haneli TCKN veya 10 haneli VKN" maxLength={11} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" />
        <p className="text-[10px] text-slate-400 mt-1">11 haneli TC Kimlik No veya 10 haneli Vergi Kimlik No</p>
      </div>
    </div>
  );

  const Step2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md mb-3"><Bot size={22} className="text-white" /></div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Ayarları</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Yapay zekâ asistanınızın kişiliği</p>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Ses Cinsiyeti</label>
        <div className="grid grid-cols-2 gap-2">
          {[{ value: 'female', label: 'Kadın' }, { value: 'male', label: 'Erkek' }].map(o => { const active = form.voiceGender === o.value; return (
            <button key={o.value} onClick={() => update('voiceGender', o.value)} className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all text-center ${active ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>{o.label}</button>
          )})}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Marka Sesi</label>
        <div className="grid grid-cols-2 gap-2">
          {[{ value: 'yoresel', label: 'Yöresel' }, { value: 'samimi', label: 'Samimi' }, { value: 'premium', label: 'Premium' }, { value: 'kurumsal', label: 'Kurumsal' }].map(o => { const active = form.brandVoice === o.value; return (
            <button key={o.value} onClick={() => update('brandVoice', o.value)} className={`p-2.5 rounded-xl border-2 text-xs font-semibold transition-all text-center ${active ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>{o.label}</button>
          )})}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Karşılama Stili</label>
        <div className="grid grid-cols-2 gap-2">
          {[{ value: 'firma_ad', label: 'Firma Adı ile' }, { value: 'musteri_hizmetleri', label: 'Müşteri Hizmetleri' }, { value: 'sade', label: 'Sade' }, { value: 'ai_asistani', label: 'AI Asistanı' }].map(o => { const active = form.greetingStyle === o.value; return (
            <button key={o.value} onClick={() => update('greetingStyle', o.value)} className={`p-2.5 rounded-xl border-2 text-xs font-semibold transition-all text-center ${active ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>{o.label}</button>
          )})}
        </div>
      </div>
    </div>
  );

  const Step3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md mb-3"><Package size={22} className="text-white" /></div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Hızlı Kurulum</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Kargo, ödeme ve başlangıç ayarları</p>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Kargo Firmaları</label>
        <div className="grid grid-cols-2 gap-2">
          {[{ key: 'yurtici', label: 'Yurtiçi Kargo' }, { key: 'mng', label: 'MNG Kargo' }, { key: 'aras', label: 'Aras Kargo' }, { key: 'surat', label: 'Sürat Kargo' }].map(c => { const checked = form.cargoCompanies.includes(c.key); return (
            <button key={c.key} onClick={() => toggleCargo(c.key)} className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${checked ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${checked ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>{checked && <Check size={10} className="text-white" />}</div>{c.label}
            </button>
          )})}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">IBAN (opsiyonel)</label>
        <input value={form.iban} onChange={e => update('iban', e.target.value)} placeholder="TR..." className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none font-mono" />
      </div>
      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
        <div><p className="text-sm font-medium text-slate-700 dark:text-slate-200">Demo Veri Yükle</p><p className="text-[11px] text-slate-400">Test için örnek ürünler eklensin</p></div>
        <button onClick={() => update('loadDemoData', !form.loadDemoData)} className={`relative w-10 h-5 rounded-full transition-all ${form.loadDemoData ? 'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-sm' : 'bg-gray-300 dark:bg-slate-600'}`}><div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.loadDemoData ? 'translate-x-5' : 'translate-x-0.5'}`} /></button>
      </div>
    </div>
  );

  const Step4 = () => (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md mb-3"><Sparkles size={22} className="text-white" /></div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Kurulum Özeti</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Bilgilerinizi kontrol edin</p>
      </div>
      <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 space-y-2 text-sm">
        {[
          ['Firma', form.companyName || '—'],
          ['Sektör', SECTORS.find(s => s.key === form.sector)?.label || '—'],
          ['Yetkili', form.ownerName || '—'],
          ['E-posta', form.ownerEmail || '—'],
          ['Telefon', form.phone || '—'],
          ['Şehir', form.city || '—'],
          ['AI Ses', form.voiceGender === 'female' ? 'Kadın' : 'Erkek'],
          ['Demo Veri', form.loadDemoData ? 'Yüklenecek' : 'Boş başlanacak'],
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between"><span className="text-slate-400">{l}</span><span className="font-medium text-slate-700 dark:text-slate-200">{v}</span></div>
        ))}
      </div>
      <button onClick={submit} disabled={loading} className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
        <Sparkles size={16} /> {loading ? 'Kuruluyor...' : 'Kurulumu Tamamla'}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-md">
        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-gradient-to-r from-indigo-500 to-violet-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>

        {/* Title */}
        <div className="text-center mb-1">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
            <Sparkles size={18} className="text-indigo-500" /> SiparişAsistanı Kurulum Rehberi
          </h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 mb-6">
          <span>Adım {step + 1} / {STEPS.length}</span>
          <span className="w-20 h-1 bg-slate-100 dark:bg-slate-700 rounded-full"><div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></span>
        </div>

        {/* Step Content */}
        {step === 0 && <Step0 />}
        {step === 1 && <Step1 />}
        {step === 2 && <Step2 />}
        {step === 3 && <Step3 />}
        {step === 4 && <Step4 />}

        {/* Navigation */}
        {step < 4 && (
          <div className="flex justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
              className="inline-flex items-center gap-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <ArrowLeft size={14} /> Geri
            </button>
            <button onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-1 px-6 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md">
              Devam <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
