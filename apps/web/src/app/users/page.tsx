'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, X, Edit3, Key, Trash2, Shield, Users2, Eye, Upload, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  { module: 'Şikayet & İstek', manager: true, staff: true, desc: 'Yardım masası ve şikayet takibi' },
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
  const tid = '00000000-0000-0000-0000-000000000001';

  // Bulk import states
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Array<Record<string, string>>>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const IMPORT_FIELDS: Record<string, string> = { name: 'Ad Soyad', phone: 'Telefon', city: 'Şehir', address: 'Adres', company_name: 'Şirket', birth_date: 'Doğum Tarihi', identity_number: 'TC / Vergi No' };

  useEffect(() => {
    try { setCurrentUserRole(JSON.parse(localStorage.getItem('auth_user') || '{}').role || 'owner'); } catch {}
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${tid}`, { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data as User[]);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', role: 'staff', active: true });
    setError('');
  };

  const openAdd = () => { setEditingUser(null); resetForm(); setShowModal(true); };
  const openEdit = (u: User) => { setEditingUser(u); setForm({ name: u.name, email: u.email, password: '', role: u.role, active: u.active }); setShowModal(true); setError(''); };

  const [nameKey, phoneKey, cityKey, addressKey, companyKey, birthdateKey, identityKey] = Object.keys(IMPORT_FIELDS);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
        const headers = Object.keys(data[0] || {});
        setImportPreview(data.slice(0, 5));
        setImportHeaders(headers);
        const autoMap: Record<string, string> = {};
        for (const h of headers) {
          const hl = h.toLowerCase();
          if (hl.includes('ad') && hl.includes('soy')) autoMap[nameKey] = h;
          else if (hl.includes('telefon') || hl.includes('phone') || hl.includes('tel')) autoMap[phoneKey] = h;
          else if (hl.includes('şehir') || hl.includes('city') || hl.includes('il')) autoMap[cityKey] = h;
          else if (hl.includes('adres') || hl.includes('address')) autoMap[addressKey] = h;
          else if (hl.includes('şirket') || hl.includes('company') || hl.includes('firma')) autoMap[companyKey] = h;
          else if (hl.includes('doğum') || hl.includes('birth') || hl.includes('dogum')) autoMap[birthdateKey] = h;
          else if (hl.includes('tc') || hl.includes('vergi') || hl.includes('kimlik') || hl.includes('identity')) autoMap[identityKey] = h;
        }
        setImportMapping(autoMap);
      } catch { setImportPreview([]); setImportHeaders([]); }
    };
    reader.readAsBinaryString(file);
  };

  const doImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const file = importFile!;
      const data = await new Promise<Array<Record<string, string>>>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const wb = XLSX.read(ev.target?.result, { type: 'binary' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          resolve(XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' }));
        };
        reader.readAsBinaryString(file);
      });
      const mapped = data.map((row) => {
        const result: Record<string, string> = {};
        for (const [field, header] of Object.entries(importMapping)) {
          if (header && row[header] !== undefined) result[field] = String(row[header]);
        }
        return result;
      }).filter((r) => r.name || r.phone);

      const res = await fetch(`/api/customers/bulk-import/${tid}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ rows: mapped, skipDuplicates: true }),
      });
      const json = await res.json();
      setImportResult(json);
      if (json.imported > 0) load();
    } catch { setImportResult({ imported: 0, skipped: 0, errors: ['Sunucu hatası'] }); }
    setImporting(false);
  };

  const resetImport = () => { setShowImport(false); setImportFile(null); setImportPreview([]); setImportHeaders([]); setImportMapping({}); setImportResult(null); };

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
    } catch {}
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
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kullanıcı Yönetimi</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{users.length} kullanıcı</p>
        </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowImport(true)}

className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-lg text-sm hover:bg-amber-100 dark:hover:bg-amber-900/30">
              <Upload size={15} /> Excel'den Müşteri Yükle
            </button>
            <button onClick={() => setShowMatrix(!showMatrix)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Eye className="w-4 h-4" /> {showMatrix ? 'Matrisi Gizle' : 'Yetki Matrisi'}
          </button>
          <button onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
            <Plus className="w-4 h-4" /> Yeni Kullanıcı Ekle
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
            className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-indigo-400 outline-none"
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
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${u.role === 'owner' ? 'bg-amber-500' : u.role === 'manager' ? 'bg-violet-500' : 'bg-blue-500'}`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</div>
                          <div className="text-xs text-gray-400 dark:text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${rc.color} ${rc.bg} border ${rc.border}`}>
                        {rc.label}
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
                            {u.active ? '🔴' : '🟢'}
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
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50">
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

      {/* Bulk Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { if (!importing) resetImport(); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Excel'den Müşteri Yükle</h3>
              </div>
              <button onClick={resetImport} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4">
              {!importResult && (
                <>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-8 text-center">
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" id="import-file" />
                    <label htmlFor="import-file" className="cursor-pointer flex flex-col items-center gap-2">
                      <Upload size={28} className="text-slate-400" />
                      <span className="text-sm text-gray-600 dark:text-slate-300">
                        {importFile ? importFile.name : 'Excel veya CSV dosyası sürükleyin ya da seçin'}
                      </span>
                      {!importFile && <span className="text-xs text-slate-400">.xlsx, .xls, .csv</span>}
                    </label>
                  </div>

                  {importHeaders.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Sütun Eşleştirme</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(IMPORT_FIELDS).map(([field, label]) => (
                          <div key={field} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-24 flex-shrink-0">{label}</span>
                            <select
                              value={importMapping[field] || ''}
                              onChange={(e) => setImportMapping({ ...importMapping, [field]: e.target.value })}
                              className="flex-1 px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                              <option value="">-- Seçin --</option>
                              {importHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importPreview.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Önizleme (ilk {Math.min(importPreview.length, 5)} satır)</h4>
                      <div className="overflow-auto">
                        <table className="w-full text-xs border border-slate-200 dark:border-slate-700">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700">
                              {importHeaders.map((h) => <th key={h} className="px-2 py-1.5 text-left text-slate-600 dark:text-slate-300 border-b">{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.slice(0, 5).map((row, i) => (
                              <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                                {importHeaders.map((h) => <td key={h} className="px-2 py-1 text-slate-700 dark:text-slate-300">{String(row[h] || '')}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {importResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Download size={20} />
                    <span className="font-semibold">İçe aktarma tamamlandı</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-emerald-600">{importResult.imported}</div>
                      <div className="text-xs text-emerald-500">içe aktarıldı</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-amber-600">{importResult.skipped}</div>
                      <div className="text-xs text-amber-500">atlandı</div>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-xs text-red-600 mb-1 font-medium">Hatalar:</p>
                      {importResult.errors.map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <button onClick={resetImport} disabled={importing} className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">İptal</button>
              {!importResult && importFile && importMapping.name && importMapping.phone && (
                <button onClick={doImport} disabled={importing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50">
                  {importing ? 'Yükleniyor...' : 'Yüklemeyi Başlat'}
                </button>
              )}
              {importResult && (
                <button onClick={resetImport} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Kapat</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
