'use client';

import { useState, useEffect } from 'react';
import { login } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Bot, PhoneCall, ShoppingBag, Users, Package, Truck, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

const FLOW_STEPS = [
  { icon: PhoneCall, label: 'Telefon', color: 'bg-blue-500' },
  { icon: Bot, label: 'AI', color: 'bg-violet-500' },
  { icon: ShoppingBag, label: 'Siparis', color: 'bg-emerald-500' },
  { icon: Users, label: 'CRM', color: 'bg-indigo-500' },
  { icon: Package, label: 'Kargo', color: 'bg-amber-500' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('demo@siparisasistani.com');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % FLOW_STEPS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(email, password);
      router.push('/dashboard');
    } catch {
      setError('Gecersiz email veya sifre');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 flex">
      {/* Left - AI Flow Animation */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(124,58,237,0.15),transparent_50%)]" />
        <div className="relative z-10 text-center space-y-8 max-w-md">
          <div className="text-4xl font-bold text-white mb-2">
            <span className="bg-ai-gradient bg-clip-text text-transparent">SiparisAsistani</span>
          </div>
          <p className="text-slate-400 text-sm">AI destekli siparis ve isletme yonetim sistemi</p>

          {/* Flow Animation */}
          <div className="relative py-12">
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-700 -translate-x-1/2" />
            {FLOW_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = i === activeStep;
              const isPast = i < activeStep;
              return (
                <div key={i} className={`flex items-center gap-4 py-3 transition-all duration-700 relative ${isActive ? 'scale-105' : 'opacity-60'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${isActive ? `${step.color} shadow-lg shadow-violet-500/25 scale-110` : 'bg-slate-700'}`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-medium transition-colors duration-500 ${isActive ? 'text-white' : 'text-slate-500'}`}>{step.label}</p>
                    <p className="text-xs text-slate-600">{isActive ? 'İşleniyor...' : isPast ? 'Tamamlandı' : 'Bekliyor'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center lg:text-left">
            <div className="w-10 h-10 rounded-xl bg-ai-gradient flex items-center justify-center text-white font-bold mx-auto lg:mx-0 mb-4">S</div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hoş Geldiniz</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">SiparişAsistanı paneline giriş yapın</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">E-posta</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                placeholder="ornek@firma.com" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Sifre</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-ai-gradient hover:bg-ai-gradient-hover text-white rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
