'use client';

import { useState } from 'react';
import { login } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('demo@siparisasistani.com');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(email, password);
      if (data.user.role === 'owner' || data.user.role === 'manager') {
        router.push('/dashboard');
      } else {
        router.push('/orders');
      }
    } catch (err) {
      setError('Gecersiz email veya sifre');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">📦</div>
          <h1 className="text-2xl font-bold text-gray-900">SiparisAsistani</h1>
          <p className="text-sm text-gray-500 mt-1">Yonetici Paneli</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="ornek@firma.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sifre</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="••••••••" required />
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
            {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
          </button>
        </form>

        <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
          <p className="font-medium mb-1">Demo Hesap:</p>
          <p>E-posta: demo@siparisasistani.com</p>
          <p>Sifre: demo123</p>
        </div>
      </div>
    </div>
  );
}
