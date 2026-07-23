'use client';

import { useEffect, useState } from 'react';
import { Bot, PhoneCall, ShoppingBag, Users, Package, ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';

const FLOW_STEPS = [
  { icon: PhoneCall, label: 'Telefon', desc: 'Musteri arar', color: 'bg-blue-500' },
  { icon: Bot, label: 'AI', desc: 'Yapay zeka anlar', color: 'bg-violet-500' },
  { icon: ShoppingBag, label: 'Siparis', desc: 'Otomatik olusur', color: 'bg-emerald-500' },
  { icon: Package, label: 'Kargo', desc: 'Teslim edilir', color: 'bg-amber-500' },
];

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setActiveStep((prev) => (prev + 1) % FLOW_STEPS.length), 2000);
    return () => clearInterval(interval);
  }, []);

  const plans = [
    { name: 'Starter', price: '299', orders: '250', features: ['AI Siparis', 'WhatsApp', 'Panel', 'E-posta Destek'] },
    { name: 'Professional', price: '599', orders: '500', features: ['AI Siparis', 'WhatsApp', 'CRM', 'Raporlar', 'Oncelikli Destek'], popular: true },
    { name: 'Business', price: '999', orders: '1000', features: ['AI Siparis', 'WhatsApp', 'CRM', 'Kampanyalar', '7/24 Destek'] },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-ai-gradient flex items-center justify-center text-white text-xs font-bold">S</div>
            <span className="font-semibold text-sm text-slate-900">SiparisAsistani</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Giris Yap</a>
            <a href="/onboarding" className="px-4 py-2 bg-ai-gradient text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all shadow-lg shadow-violet-500/20">Baslayin</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-slate-900 leading-tight">
          Telefon Siparislerini
          <br />
          <span className="bg-ai-gradient bg-clip-text text-transparent">Yapay Zeka ile</span>
          <br />
          Otomatiklestirin
        </h1>
        <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">Sucuk, lokum, bükme, yumurta ureticileri icin AI destekli siparis ve isletme yonetim sistemi.</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a href="/onboarding" className="px-6 py-3 bg-ai-gradient text-white rounded-xl text-sm font-medium hover:brightness-110 transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2">
            Ucretsiz Dene <ArrowRight className="w-4 h-4" />
          </a>
          <a href="/demo" className="px-6 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
            Canli Izle
          </a>
        </div>

        {/* Flow Animation */}
        <div className="mt-16 max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            {FLOW_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = i === activeStep;
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className={`flex flex-col items-center transition-all duration-700 ${isActive ? 'scale-110' : 'opacity-50'}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? `${step.color} shadow-lg` : 'bg-slate-100'}`}>
                      <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <p className={`text-xs mt-2 font-medium ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                    <p className="text-[10px] text-slate-400">{step.desc}</p>
                  </div>
                  {i < FLOW_STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300" />}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900">Neden SiparisAsistani?</h2>
          <div className="grid grid-cols-3 gap-6 mt-12">
            {[
              { icon: Bot, title: 'AI Siparis Alma', desc: 'Telefon ve WhatsApp uzerinden gelen siparisleri AI otomatik alir.' },
              { icon: Users, title: 'Musteri Yonetimi', desc: 'Musteri gecmisi, sikayetleri ve siparisleri tek ekranda.' },
              { icon: ShoppingBag, title: 'Siparis Takibi', desc: 'Siparis asamalari, timeline ve bildirimler anlik.' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-premium-hover transition-all">
                  <div className="w-10 h-10 rounded-lg bg-ai-gradient flex items-center justify-center"><Icon className="w-5 h-5 text-white" /></div>
                  <h3 className="font-semibold text-slate-900 mt-4">{f.title}</h3>
                  <p className="text-sm text-slate-500 mt-1.5">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900">Planlar</h2>
          <div className="grid grid-cols-3 gap-6 mt-12">
            {plans.map((plan) => (
              <div key={plan.name} className={`relative rounded-xl border-2 p-6 ${plan.popular ? 'border-violet-500 bg-white shadow-lg shadow-violet-500/10' : 'border-slate-200 bg-white'}`}>
                {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-ai-gradient text-white text-xs font-medium rounded-full">Populer</div>}
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <p className="mt-2"><span className="text-3xl font-bold text-slate-900">{plan.price} TL</span><span className="text-sm text-slate-500">/ay</span></p>
                <p className="text-sm text-slate-500 mt-1">{plan.orders} siparis</p>
                <div className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-emerald-500" />{f}</div>
                  ))}
                </div>
                <a href="/onboarding" className={`mt-6 block w-full py-2.5 text-center rounded-xl text-sm font-medium transition-all ${plan.popular ? 'bg-ai-gradient text-white shadow-lg shadow-violet-500/20' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Baslayin</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white">Hemen Baslayin</h2>
          <p className="mt-3 text-slate-400">10 dakikada isletmenizi kurun, AI siparis almaya baslasin.</p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <a href="/onboarding" className="px-6 py-3 bg-ai-gradient text-white rounded-xl text-sm font-medium hover:brightness-110 transition-all shadow-lg shadow-violet-500/25">Ucretsiz Dene</a>
            <a href="/login" className="px-6 py-3 border border-slate-600 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-800 transition-all">Giris Yap</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-slate-400">2026 SiparisAsistani. Tum haklari saklidir.</div>
      </footer>
    </div>
  );
}
