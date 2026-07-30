'use client';

import { useEffect, useState } from 'react';

export default function UsersPage() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const ROLE_TR: Record<string, string> = { owner: 'Sahip', manager: 'Yönetici', staff: 'Personel' };
const tid = '00000000-0000-0000-0000-000000000001';

  const load = () => {
    fetch(`/api/users/${tid}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setUsers(d); }).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    await fetch(`/api/users/${tid}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: '', email: '', password: '', role: 'staff' });
    load();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`/api/users/${tid}/${id}/deactivate`, { method: 'PUT' }).catch(() => {});
    load();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kullanici Yonetimi</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{users.length} kullanici</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ Kullanici Ekle</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <input placeholder="Ad Soyad" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input placeholder="E-posta" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input placeholder="Sifre" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="owner">Sahip</option>
              <option value="manager">Yönetici</option>
              <option value="staff">Personel</option>
            </select>
          </div>
          <button onClick={create} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Kaydet</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        {users.map((u) => (
          <div key={u.id as string} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${u.active ? 'bg-green-500' : 'bg-gray-300'}`} />
              <div>
                <div className="font-medium text-sm">{u.name as string}</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">{u.email as string}</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.role === 'owner' ? 'bg-purple-100 text-purple-700' : u.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 dark:text-slate-200'}`}>
                {ROLE_TR[u.role as string] || (u.role as string)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{new Date(u.created_at as string).toLocaleDateString('tr-TR')}</span>
              {u.role !== 'owner' && (
                <button onClick={() => toggleActive(u.id as string, u.active as boolean)}
                  className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100">Pasif Yap</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
