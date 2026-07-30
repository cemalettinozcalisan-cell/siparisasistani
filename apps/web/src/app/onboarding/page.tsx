'use client';

import { useState } from 'react';

const STEPS = [
  'Hos Geldiniz', 'Firma Bilgileri', 'Logo', 'Telefon / WhatsApp',
  'Odeme Bilgileri', 'Urunler', 'Kargo Ayarlari', 'AI Sesi',
  'Calisma Saatleri', 'Ilk Yonetici', 'Demo Veri', 'Kurulum Tamamlandi'
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({
    companyName: '', domain: '', phone: '', email: '', address: '', city: '', taxNumber: '',
    whatsapp: '', iban: '', logoUrl: '',
    products: [{ product_name: '', category: '', price: 0, unit: 'KG' }],
    cargoCompanies: [] as string[],
    voiceGender: 'female', brandVoice: 'yoresel', greetingStyle: 'firma_ad',
    businessHoursEnabled: false, businessHoursStart: '08:00', businessHoursEnd: '18:30',
    ownerName: '', ownerEmail: '', ownerPassword: '',
    loadDemoData: true,
  });

  const update = (key: string, value: unknown) => setForm({ ...form, [key]: value });
  const updateProduct = (i: number, key: string, value: unknown) => {
    const p = [...form.products];
    p[i] = { ...p[i], [key]: value };
    setForm({ ...form, products: p });
  };

  const toggleCargo = (co: string) => {
    const list = form.cargoCompanies.includes(co)
      ? form.cargoCompanies.filter((c) => c !== co)
      : [...form.cargoCompanies, co];
    setForm({ ...form, cargoCompanies: list });
  };

  const submit = async () => {
    setLoading(true);
    const res = await fetch('/api/onboarding', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full text-center space-y-6">
          <div className="text-6xl">??</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Kurulum Basariyla Tamamlandi</h1>
          <div className="space-y-3 text-left bg-green-50 rounded-xl p-4">
            {[
              'Firma olusturuldu',
              'Yonetici hesabi olusturuldu',
              'AI hazir',
              'Varsayilan ayarlar yuklendi',
              result.loadDemoData ? 'Demo urunleri eklendi' : null,
            ].filter(Boolean).map((msg, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-green-800">
                <span>?</span> {msg}
              </div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 dark:text-slate-300">
            <p>E-posta: <strong>{result.ownerEmail as string}</strong></p>
            <p>Giris yapmak icin panele tiklayin</p>
          </div>
          <a href="/login" className="block w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            ?? Panele Git
          </a>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="text-center space-y-4 py-8">
          <div className="text-6xl">??</div>
          <h2 className="text-2xl font-bold">SiparisAsistani'na Hos Geldiniz</h2>
          <p className="text-gray-500 dark:text-slate-400">Isletmenizi 10 dakikada kurun. AI destekli siparis asistaniniz hazir olsun.</p>
          <div className="grid grid-cols-2 gap-3 mt-6 text-sm">
            {['?? AI Siparis Alma', '?? Telefon Entegrasyonu', '?? WhatsApp', '?? Dashboard', '?? Musteri Yonetimi', '?? Kargo Takibi'].map((f) => (
              <div key={f} className="bg-blue-50 rounded-lg p-3 text-blue-700">{f}</div>
            ))}
          </div>
        </div>
      );
      case 1: return (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Firma Bilgileri</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Firma Adi" value={form.companyName} onChange={(e) => update('companyName', e.target.value)}
              className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input placeholder="E-posta" type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input placeholder="Web (domain)" value={form.domain} onChange={(e) => update('domain', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input placeholder="Adres" value={form.address} onChange={(e) => update('address', e.target.value)}
              className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input placeholder="Sehir" value={form.city} onChange={(e) => update('city', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input placeholder="Vergi No" value={form.taxNumber} onChange={(e) => update('taxNumber', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
      );
      case 2: return (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Logo</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Firma logonuzu ekleyin (URL veya dosya)</p>
          <input placeholder="Logo URL (opsiyonel)" value={form.logoUrl} onChange={(e) => update('logoUrl', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400 text-sm">
            ?? Logo yuklemek icin tiklayin (ileride)
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Telefon / WhatsApp</h2>
          <input placeholder="Telefon" value={form.phone} onChange={(e) => update('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input placeholder="WhatsApp Numarasi" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
      );
      case 4: return (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Odeme Bilgileri</h2>
          <input placeholder="IBAN" value={form.iban} onChange={(e) => update('iban', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
          <p className="text-xs text-gray-400">Kartla odeme entegrasyonu (PayTR/iyzico) ileride eklenecek</p>
        </div>
      );
      case 5: return (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Urunler</h2>
          {form.products.map((p, i) => (
            <div key={i} className="grid grid-cols-4 gap-2">
              <input placeholder="Urun adi" value={p.product_name} onChange={(e) => updateProduct(i, 'product_name', e.target.value)}
                className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input placeholder="Kategori" value={p.category} onChange={(e) => updateProduct(i, 'category', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input placeholder="Fiyat" type="number" value={p.price || ''} onChange={(e) => updateProduct(i, 'price', Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <select value={p.unit} onChange={(e) => updateProduct(i, 'unit', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="KG">KG</option>
                <option value="ADET">ADET</option>
                <option value="KUTU">KUTU</option>
                <option value="SAP">SAP</option>
              </select>
              {i > 0 && <button onClick={() => setForm({ ...form, products: form.products.filter((_, j) => j !== i) })}
                className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded">Sil</button>}
            </div>
          ))}
          <button onClick={() => setForm({ ...form, products: [...form.products, { product_name: '', category: '', price: 0, unit: 'KG' }] })}
            className="text-sm text-blue-600 hover:text-blue-800">+ Urun Ekle</button>
        </div>
      );
      case 6: return (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Kargo Ayarlari</h2>
          {['yurtici', 'mng', 'aras', 'surat'].map((co) => (
            <label key={co} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={form.cargoCompanies.includes(co)} onChange={() => toggleCargo(co)} />
              <span className="text-sm">{co === 'yurtici' ? 'Yurtici Kargo' : co === 'mng' ? 'MNG Kargo' : co === 'aras' ? 'Aras Kargo' : 'Surat Kargo'}</span>
            </label>
          ))}
        </div>
      );
      case 7: return (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">AI Sesi</h2>
          <div className="grid grid-cols-3 gap-3">
            {['female', 'male'].map((g) => (
              <button key={g} onClick={() => update('voiceGender', g)}
                className={`p-4 rounded-xl border-2 text-center transition-colors ${form.voiceGender === g ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <span className="text-2xl">{g === 'female' ? '??' : '??'}</span>
                <p className="text-xs mt-1">{g === 'female' ? 'Kadin Ses' : 'Erkek Ses'}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">AI'nin konusma tarzini secin. (ElevenLabs entegrasyonu ile geliscek)</p>
          <select value={form.brandVoice} onChange={(e) => update('brandVoice', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="yoresel">Yoresel - Afyon esnafina uygun</option>
            <option value="samimi">Samimi - Sicak ve icten</option>
            <option value="resmi">Resmi - Profesyonel</option>
            <option value="premium">Premium - Zarif ve kaliteli</option>
          </select>
        </div>
      );
      case 8: return (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Calisma Saatleri</h2>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.businessHoursEnabled} onChange={(e) => update('businessHoursEnabled', e.target.checked)} />
            <span className="text-sm">Calisma saati kontrolu aktif</span>
          </label>
          {form.businessHoursEnabled && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div><label className="text-xs text-gray-500 dark:text-slate-400">Acilis</label><input type="time" value={form.businessHoursStart} onChange={(e) => update('businessHoursStart', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="text-xs text-gray-500 dark:text-slate-400">Kapanis</label><input type="time" value={form.businessHoursEnd} onChange={(e) => update('businessHoursEnd', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            </div>
          )}
        </div>
      );
      case 9: return (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Ilk Yonetici Hesabi</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Sisteme giris yapacak yonetici bilgileri</p>
          <input placeholder="Ad Soyad" value={form.ownerName} onChange={(e) => update('ownerName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input placeholder="E-posta" type="email" value={form.ownerEmail} onChange={(e) => update('ownerEmail', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input placeholder="Sifre" type="password" value={form.ownerPassword} onChange={(e) => update('ownerPassword', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
      );
      case 10: return (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Demo Veri</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Sistemi test etmek icin ornek veriler yuklensin mi?</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => update('loadDemoData', true)}
              className={`p-4 rounded-xl border-2 text-center ${form.loadDemoData ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
              <span className="text-2xl">?</span>
              <p className="text-sm font-medium mt-1">Evet, yukle</p>
              <p className="text-xs text-gray-400">3 ornek urun eklensin</p>
            </button>
            <button onClick={() => update('loadDemoData', false)}
              className={`p-4 rounded-xl border-2 text-center ${!form.loadDemoData ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <span className="text-2xl">??</span>
              <p className="text-sm font-medium mt-1">Hayir, bos basla</p>
              <p className="text-xs text-gray-400">Urunleri sonra eklerim</p>
            </button>
          </div>
        </div>
      );
      case 11: return (
        <div className="space-y-4 text-center py-4">
          <div className="text-5xl">??</div>
          <h2 className="text-2xl font-bold">Kurulum Hazir</h2>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
            {[
              ['Firma', form.companyName || 'Belirtilmedi'],
              ['Yonetici', form.ownerEmail],
              ['Telefon', form.phone],
              ['Urun Sayisi', String(form.products.filter((p) => p.product_name).length)],
              ['AI Ses', form.voiceGender === 'female' ? 'Kadin' : 'Erkek'],
              ['Demo Veri', form.loadDemoData ? 'Yuklenecek' : 'Yuklenmeyecek'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-slate-400">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
          <button onClick={submit} disabled={loading}
            className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 text-lg">
            {loading ? 'Kurulum yapiliyor...' : '?? Kurulumu Tamamla'}
          </button>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-xl">
        {/* Progress */}
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= step ? 'bg-blue-500' : 'bg-gray-200'}`} />
          ))}
        </div>
        <div className="text-xs text-gray-400 mb-4 text-right">Adim {step + 1} / {STEPS.length}</div>

        {/* Step Content */}
        {renderStep()}

        {/* Navigation Buttons */}
        {step < 11 && (
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">
              Geri
            </button>
            <button onClick={() => setStep(Math.min(11, step + 1))}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              {step === 10 ? 'Ozeti Gor' : 'Devam'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
