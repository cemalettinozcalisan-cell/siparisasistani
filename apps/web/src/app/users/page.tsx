'use client';

import { getTenantId } from '@/lib/tenant';

import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, X, Edit3, Key, Trash2, Shield, Users2, Eye, Users } from 'lucide-react';

function authHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
  } catch { return { 'Content-Type': 'application/json' }; }
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'owner' | 'manager' | 'staff';
  active: boolean;
  created_at: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  owner: { label: 'Sahip', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800' },
  manager: { label: 'Yönetici', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30', border: 'border-violet-200 dark:border-violet-800' },
  staff: { label: 'Personel', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800' },
};

const ROLES = ['owner', 'manager', 'staff'];

const ROLE_MATRIX: { module: string; manager: boolean; staff: boolean; desc: string }[] = [
  { module: 'Kontrol Paneli', manager: true, staff: true, desc: 'Dashboard ve KPI görüntüleme' },
  { module: 'Tüm Siparişler', manager: true, staff: true, desc: 'Sipariş listesini görme ve yönetme' },
  { module: 'Canlı Siparişler', manager: true, staff: true, desc: 'Kanban board ve sipariş durum güncelleme' },
  { module: 'Görüşmeler', manager: true, staff: true, desc: 'Müşteri konuşma geçmişi' },
  { module: 'Talep & İstek', manager: true, staff: true, desc: 'Yardım masası ve talep takibi' },
  { module: 'Müşteriler', manager: true, staff: true, desc: 'Müşteri listesi ve detay görüntüleme' },
  { module: 'Ürünler', manager: true, staff: true, desc: 'Ürün ekleme ve düzenleme' },
  { module: 'Raporlar', manager: true, staff: true, desc: 'Satış ve performans raporları' },
  { module: 'Kampanyalar', manager: true, staff: false, desc: 'Kampanya oluşturma ve yönetme' },
  { module: 'AI Satış Motoru', manager: true, staff: false, desc: 'Otomatik kampanya ve hatırlatmalar' },
  { module: 'Abonelik', manager: true, staff: false, desc: 'Plan ve fatura yönetimi' },
  { module: 'Bildirimler', manager: true, staff: true, desc: 'Sistem bildirimleri' },
  { module: 'İşletme Ayarları', manager: true, staff: false, desc: 'AI, çalışma saatleri, ödeme ayarları' },
  { module: 'Kullanıcı Yönetimi', manager: true, staff: false, desc: 'Kullanıcı ekleme ve düzenleme' },
  { module: 'Entegrasyonlar', manager: false, staff: false, desc: 'Kanal ve yazıcı ayarları (Sadece sahip)' },
  { module: 'API Anahtarları', manager: false, staff: false, desc: 'Servis API key yönetimi (Sadece sahip)' },
  { module: 'AI Denetim', manager: false, staff: false, desc: 'AI log ve kalite kontrol (Sadece sahip)' },
  { module: 'Sistem Durumu', manager: true, staff: true, desc: 'Sağlık durumu ve metrikler' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('owner');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff', active: true });
  const tid = getTenantId();

  useEffect(() => {
    try { setCurrentUserRole(JSON.parse(localStorage.getItem('auth_user') || '{}').role || 'owner'); } catch {}
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${tid}`, { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data as User[]);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', role: 'staff', active: true });
    setError('');
  };

  const openAdd = () => { setEditingUser(null); resetForm(); setShowModal(true); };
  const openEdit = (u: User) => { setEditingUser(u); setForm({ name: u.name, email: u.email, password: '', role: u.role, active: u.active }); setShowModal(true); setError(''); };

  const save = async () => {
    if (!form.name || !form.email) { setError('Ad Soyad ve E-posta zorunludur'); return; }
    if (!editingUser && !form.password) { setError('Şifre zorunludur'); return; }
    setError('');
    setSaving(true);
    try {
      if (editingUser) {
        const body: Record<string, unknown> = { name: form.name, email: form.email, role: form.role, active: form.active };
        if (form.password) body.password = form.password;
        const res = await fetch(`/api/users/${tid}/${editingUser.id}`, {
          method: 'PUT', headers: authHeaders(), body: JSON.stringify(body),
        });
        if (!res.ok) { const err = await res.json(); setError(err.message || 'Güncelleme başarısız'); setSaving(false); return; }
      } else {
        const res = await fetch(`/api/users/${tid}`, {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify(form),
        });
        if (!res.ok) { const err = await res.json(); setError(err.message || 'Ekleme başarısız'); setSaving(false); return; }
      }
      setShowModal(false);
      load();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    await fetch(`/api/users/${tid}/${deletingUser.id}`, { method: 'DELETE', headers: authHeaders() });
    setDeletingUser(null);
    load();
  };

  const toggleActive = async (u: User) => {
    const endpoint = u.active ? 'deactivate' : 'activate';
    await fetch(`/api/users/${tid}/${u.id}/${endpoint}`, { method: 'PUT', headers: authHeaders() });
    load();
  };

  const resetPassword = async (u: User) => {
    const pw = prompt(`${u.name} için yeni şifre:`);
    if (!pw) return;
    await fetch(`/api/users/${tid}/${u.id}`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify({ password: pw }),
    });
    load();
  };

  // Filter
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    if (currentUserRole === 'manager' && u.role === 'owner') return false;
    return matchesSearch && matchesRole;
  });

  // Available roles for form (manager can't create owner)
  const availableRoles = currentUserRole === 'manager'
    ? ROLES.filter((r) => r !== 'owner')
    : ROLES;

  return (
    <div className="p-4 md:p-6 space-y-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
              <Users size={16} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Kullanıcı Yönetimi</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{users.length} kullanıcı</p>
        </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowMatrix(!showMatrix)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Eye size={14} /> {showMatrix ? 'Matrisi Gizle' : 'Yetki Matrisi'}
          </button>
          <button onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-xs font-semibold transition-all shadow-md">
            <Plus size={14} /> Kullanıcı Ekle
          </button>
        </div>
      </div>

      {/* Role Matrix */}
      {showMatrix && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-sm text-gray-900 dark:text-white">Yetki Matrisi</h2>
            <span className="text-xs text-gray-400">Yönetici ve Personel yetkileri</span>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-[1fr_70px_70px_1fr] gap-2 px-3 py-2 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700">
              <span>Modül</span>
              <span className="text-center">Yönetici</span>
              <span className="text-center">Personel</span>
              <span>Açıklama</span>
            </div>
            {ROLE_MATRIX.map((row) => (
              <div key={row.module} className="grid grid-cols-[1fr_70px_70px_1fr] gap-2 px-3 py-2 border-b border-slate-50 dark:border-slate-700/30 text-sm hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                <span className="font-medium text-gray-700 dark:text-slate-300">{row.module}</span>
                <span className={`text-center text-xs font-semibold ${row.manager ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-slate-600'}`}>
                  {row.manager ? '✓' : '—'}
                </span>
                <span className={`text-center text-xs font-semibold ${row.staff ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-slate-600'}`}>
                  {row.staff ? '✓' : '—'}
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-500">{row.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad veya e-posta ile ara..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
          <option value="all">Tüm Roller</option>
          <option value="manager">Yönetici</option>
          <option value="staff">Personel</option>
          {currentUserRole === 'owner' && <option value="owner">Sahip</option>}
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Kullanıcı</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Rol</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Durum</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Eklenme</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Aksiyonlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {filtered.map((u) => {
                const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.staff;
                const isOwner = u.role === 'owner';
                const canEdit = currentUserRole === 'owner' || !isOwner;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${u.role === 'owner' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : u.role === 'manager' ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'} shadow-sm`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</div>
                          <div className="text-xs text-gray-400 dark:text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white shadow-sm ${u.role === 'owner' ? 'bg-gradient-to-r from-amber-500 to-orange-600' : u.role === 'manager' ? 'bg-gradient-to-r from-violet-500 to-purple-600' : 'bg-gradient-to-r from-blue-500 to-cyan-600'}`}>
                        {ROLE_CONFIG[u.role]?.label || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {u.active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 dark:text-slate-500">
                      {new Date(u.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Düzenle">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => resetPassword(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Şifre Sıfırla">
                            <Key className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleActive(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title={u.active ? 'Pasif Yap' : 'Aktif Yap'}>
                            <span className={`w-2 h-2 rounded-full block ${u.active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          </button>
                          {!isOwner && (
                            <button onClick={() => setDeletingUser(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Sil">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                      {!canEdit && <span className="text-xs text-gray-300 dark:text-slate-600 italic">Sistem</span>}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400 dark:text-slate-500">
                    <Users2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Kullanıcı bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {error && <div className="p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">{error}</div>}
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ad Soyad" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none" />
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="E-posta" type="email" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none" />
              <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingUser ? 'Yeni Şifre (değişmeyecekse boş bırakın)' : 'Şifre'} type="password"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Rol</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Durum</label>
                  <select value={form.active ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, active: e.target.value === 'active' })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">İptal</button>
              <button onClick={save} disabled={saving}
               className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 shadow-sm">
                {saving ? 'Kaydediliyor...' : editingUser ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDeletingUser(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Kullanıcıyı Sil</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">{deletingUser.name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">Bu işlem geri alınamaz. Kullanıcı kalıcı olarak silinecek.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeletingUser(null)} className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300">İptal</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
