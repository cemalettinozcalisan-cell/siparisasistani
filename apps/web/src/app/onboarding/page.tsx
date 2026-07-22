'use client';

import { useState } from 'react';

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    companyName: '', domain: '', phone: '', email: '', iban: '',
    products: [{ product_name: '', price: 0, unit: 'KG' }],
  });
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const addProduct = () => {
    setForm({ ...form, products: [...form.products, { product_name: '', price: 0, unit: 'KG' }] });
  };

  const updateProduct = (i: number, key: string, value: unknown) => {
    const products = [...form.products];
    products[i] = { ...products[i], [key]: value };
    setForm({ ...form, products });
  };

  const submit = async () => {
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setResult(data);
  };

  const steps = [
    { title: 'İşletme Bilgileri', content: (
      <div className="space-y-3">
        <input placeholder="İşletme Adı" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        <input placeholder="Domain (ı¶rnek: firmaadi)" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        <input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        <input placeholder="E-posta" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        <input placeholder="IBAN" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
      </div>
    )},
    { title: 'ıœrünler', content: (
      <div className="space-y-3">
        {form.products.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input placeholder="ıœrün adı" value={p.product_name} onChange={(e) => updateProduct(i, 'product_name', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg" />
            <input placeholder="Fiyat" type="number" value={p.price || ''} onChange={(e) => updateProduct(i, 'price', Number(e.target.value))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg" />
            <select value={p.unit} onChange={(e) => updateProduct(i, 'unit', e.target.value)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg">
              <option value="KG">KG</option>
              <option value="ADET">ADET</option>
              <option value="KUTU">KUTU</option>
            </select>
          </div>
        ))}
        <button onClick={addProduct} className="text-sm text-blue-600 hover:text-blue-800">+ ıœrün Ekle</button>
      </div>
    )},
  ];

  if (result) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-10 text-center space-y-4">
        <div className="text-5xl">ğı‰</div>
        <h2 className="text-2xl font-bold">Kurulum Tamamlandı!</h2>
        <p className="text-gray-600">{String(result.companyName)} başarıyla eklendi.</p>
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
          Tenant ID: {String(result.tenantId)}
        </div>
        <a href="/dashboard" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg">Panele Git</a>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Sisteme Hoş Geldiniz</h1>
        <p className="text-sm text-gray-500 mt-1">Adım {step + 1} / {steps.length}</p>
      </div>

      <div className="flex gap-2 justify-center">
        {steps.map((_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-lg mb-4">{steps[step].title}</h2>
        {steps[step].content}
      </div>

      <div className="flex justify-between">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50">
          Geri
        </button>
        {step < steps.length - 1 ? (
          <button onClick={() => setStep(step + 1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
            Devam
          </button>
        ) : (
          <button onClick={submit}
            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">
            ğıš Sistemi Kur
          </button>
        )}
      </div>
    </div>
  );
}
