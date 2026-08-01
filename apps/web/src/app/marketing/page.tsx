'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Plus, Edit3, Trash2, Tags, Gift, Clock, ShoppingCart, Calendar, Save } from 'lucide-react';
import { getTenantId, getUserRole } from '@/lib/tenant';

interface Campaign {
  id: string;
  title: string;
  description: string;
  condition: string;
  offer: string;
  min_amount: number;
  min_quantity: number;
  target_product: string;
  start_date: string;
  end_date: string;
  active: boolean;
  created_at: string;
}

export default function MarketingPage() {
  const [tab, setTab] = useState<'automation' | 'campaigns'>('automation');
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('owner');
  const tid = getTenantId();
  const isOwner = userRole === 'owner';

  const [form, setForm] = useState({
    title: '', description: '', condition: '', offer: '',
    minAmount: '', minQuantity: '', targetProduct: '',
    startDate: '', endDate: '',
  });

  useEffect(() => { setUserRole(getUserRole()); }, []);

  const loadAll = useCallback(async () => {
    try {
      const [sRes, cRes, stRes] = await Promise.all([
        fetch(`/api/settings/${tid}`).then(r => r.json()),
        fetch(`/api/campaigns/${tid}`).then(r => r.json()),
        fetch(`/api/sales-engine/stats/${tid}`).then(r => r.json()),
      ]);
      setSettings(sRes);
      if (Array.isArray(cRes)) setCampaigns(cRes);
      setStats(stRes);
    } catch {}
  }, [tid]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveSetting = async (key: string, value: unknown) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    try {
      await fetch(`/api/settings/${tid}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated),
      });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Kaydedilemedi, lütfen tekrar deneyin.');
      setSettings(settings); // Rollback
      setTimeout(() => setError(''), 3000);
    }
  };

  const triggerAutomation = async () => {
    try {
      await fetch(`/api/sales-engine/trigger/${tid}`, { method: 'POST' });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Otomasyon tetiklenemedi.');
      setTimeout(() => setError(''), 3000);
    }
    loadAll();
  };

  // Campaign CRUD
  const openNewForm = () => { setEditingId(null); setForm({ title: '', description: '', condition: '', offer: '', minAmount: '', minQuantity: '', targetProduct: '', startDate: '', endDate: '' }); setShowForm(true); };
  const openEditForm = (c: Campaign) => { setEditingId(c.id); setForm({ title: c.title, description: c.description || '', condition: c.condition, offer: c.offer, minAmount: String(c.min_amount || ''), minQuantity: String(c.min_quantity || ''), targetProduct: c.target_product || '', startDate: c.start_date ? c.start_date.split('T')[0] : '', endDate: c.end_date ? c.end_date.split('T')[0] : '' }); setShowForm(true); };

  const saveCampaign = async () => {
    const body = {
      title: form.title, description: form.description, condition: form.condition, offer: form.offer,
      min_amount: form.minAmount ? Number(form.minAmount) : null,
      min_quantity: form.minQuantity ? Number(form.minQuantity) : null,
      target_product: form.targetProduct || null,
      start_date: form.startDate || null, end_date: form.endDate || null, active: true,
    };
    try {
      if (editingId) {
        await fetch(`/api/campaigns/${tid}/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        await fetch(`/api/campaigns/${tid}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      setShowForm(false);
      loadAll();
    } catch {
      setError('Kampanya kaydedilemedi.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const toggleCampaign = async (c: Campaign) => {
    try {
      await fetch(`/api/campaigns/${tid}/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !c.active }) });
      loadAll();
    } catch {
      setError('Durum değiştirilemedi.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const deleteCampaign = async (c: Campaign) => {
    if (!confirm(`${c.title} kampanyasını silmek istediğinize emin misiniz?`)) return;
    try {
      await fetch(`/api/campaigns/${tid}/${c.id}`, { method: 'DELETE' });
      loadAll();
    } catch {
      setError('Kampanya silinemedi.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!enabled)}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pazarlama</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Otomasyon kuralları ve kampanya yönetimi</p>
        </div>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300">✅ Kaydedildi</div>
      )}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">❌ {error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
        {[
          { key: 'automation' as const, label: 'Otomatik Satış Kuralları', icon: <span>🎯</span> },
          { key: 'campaigns' as const, label: 'Özel Kampanyalar', icon: <span>🎁</span> },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Automation Rules */}
      {tab === 'automation' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Gönderilen Mesaj', value: String(stats.sent || 0), icon: '📤', border: 'border-blue-200' },
              { label: 'Tekrar Sipariş Oranı', value: `%${stats.reorder || 0}`, icon: '🔄', border: 'border-emerald-200' },
              { label: 'Kurtarılan Sepet', value: String(stats.abandoned_cart || 0), icon: '🛒', border: 'border-amber-200' },
              { label: 'Doğum Günü Mesajı', value: String(stats.birthday || 0), icon: '🎂', border: 'border-pink-200' },
            ].map((card) => (
              <div key={card.label} className={`bg-white dark:bg-slate-800 border ${card.border} rounded-xl p-4 shadow-sm`}>
                <span className="text-lg">{card.icon}</span>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</div>
                <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Main toggle */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Satış Otomasyonu</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">Tüm otomatik kampanya ve hatırlatmaları kontrol eder</p>
              </div>
              <Toggle enabled={!!settings.sales_automation_enabled} onChange={(v) => saveSetting('sales_automation_enabled', v)} />
            </div>
          </div>

          {/* Rule Cards */}
          {[
            { key: 'reorder_reminder_days', label: 'Tekrar Sipariş Hatırlatma', desc: 'Son siparişten sonra müşteriye hatırlatma mesajı', icon: <Clock className="w-4 h-4 text-blue-500" />, valueKey: 'reorder_reminder_days', suffix: 'gün', type: 'number' as const, defaultVal: 30 },
            { key: 'abandoned_cart_enabled', label: 'Sepeti Terk Eden Müşteri', desc: 'Siparişi yarım bırakan müşteriye hatırlatma', icon: <ShoppingCart className="w-4 h-4 text-amber-500" />, extraKey: 'abandoned_cart_hours', extraSuffix: 'saat', type: 'toggle' as const },
            { key: 'holiday_campaigns_enabled', label: 'Bayram / Ramazan Kampanyası', desc: 'Özel günlerde otomatik kampanya mesajı', icon: <Gift className="w-4 h-4 text-rose-500" />, type: 'toggle' as const },
            { key: 'birthday_reminder_enabled', label: '🎂 Doğum Günü Pazarlama', desc: 'Müşteri doğum gününde özel indirim mesajı', icon: <Calendar className="w-4 h-4 text-pink-500" />, type: 'birthday' as const },
          ].map((rule) => (
            <div key={rule.key} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center">{rule.icon}</div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{rule.label}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{rule.desc}</p>
                  </div>
                </div>
                {rule.type !== 'birthday' ? (
                  <Toggle enabled={!!settings[rule.key]} onChange={(v) => saveSetting(rule.key, v)} />
                ) : (
                  <Toggle enabled={!!settings.birthday_reminder_enabled} onChange={(v) => saveSetting('birthday_reminder_enabled', v)} />
                )}
              </div>
              {!!(settings[rule.key] || (rule.type === 'birthday' && settings.birthday_reminder_enabled)) && (
                <div className="pl-10 space-y-2">
                  {rule.type === 'number' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Süre:</span>
                      <input type="number" value={String(settings[rule.valueKey] || rule.defaultVal)}
                        onChange={(e) => saveSetting(rule.valueKey, Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                      <span className="text-xs text-gray-400">{rule.suffix}</span>
                    </div>
                  )}
                  {rule.type === 'toggle' && rule.extraKey && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Süre:</span>
                      <input type="number" value={String(settings[rule.extraKey] || 24)}
                        onChange={(e) => saveSetting(rule.extraKey, Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                      <span className="text-xs text-gray-400">{rule.extraSuffix}</span>
                    </div>
                  )}
                  {rule.type === 'birthday' && (
                    <div className="space-y-2 bg-pink-50/50 dark:bg-pink-900/10 rounded-lg p-3 border border-pink-100 dark:border-pink-800">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-20">İndirim Tipi:</span>
                        <select value={String(settings.birthday_discount_type || 'percent')}
                          onChange={(e) => saveSetting('birthday_discount_type', e.target.value)}
                          className="px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                          <option value="percent">Yüzde (%)</option>
                          <option value="fixed">Sabit Tutar (TL)</option>
                          <option value="free_shipping">Ücretsiz Kargo</option>
                        </select>
                      </div>
                      {settings.birthday_discount_type !== 'free_shipping' && (
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-20">Değer:</span>
                          <input type="number" value={String(settings.birthday_discount_value || 10)}
                            onChange={(e) => saveSetting('birthday_discount_value', Number(e.target.value))}
                            className="w-20 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                          <span className="text-xs text-gray-400">{settings.birthday_discount_type === 'percent' ? '%' : 'TL'}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <span className="text-xs text-gray-500 w-20 mt-1">Mesaj:</span>
                        <textarea value={String(settings.birthday_message_template || '')}
                          onChange={(e) => saveSetting('birthday_message_template', e.target.value)}
                          placeholder='İyi ki doğdunuz {name}! Doğum gününüze özel %10 indirim kodunuz: BGUD10'
                          className="flex-1 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white min-h-[50px]" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Trigger button */}
          {isOwner && (
            <div className="flex justify-end">
              <button onClick={triggerAutomation}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
                ⚡ Şimdi Çalıştır
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Campaigns */}
      {tab === 'campaigns' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-slate-400">{campaigns.length} kampanya</span>
            <button onClick={openNewForm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
              <Plus className="w-4 h-4" /> Kampanya Ekle
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c) => (
              <div key={c.id} className={`bg-white dark:bg-slate-800 rounded-xl border p-5 shadow-sm transition-all ${c.active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-700/50 opacity-60'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{c.title}</h3>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                    {c.active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-gray-500 dark:text-slate-400 mb-4">
                  {c.condition && <p>🎯 {c.condition}</p>}
                  {c.offer && <p>🎁 {c.offer}</p>}
                  {c.target_product && <p>📦 {c.target_product}</p>}
                  {c.start_date && <p>📅 {new Date(c.start_date).toLocaleDateString('tr-TR')} → {c.end_date ? new Date(c.end_date).toLocaleDateString('tr-TR') : '—'}</p>}
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button onClick={() => toggleCampaign(c)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium ${c.active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                    {c.active ? 'Durdur' : 'Aktif Et'}
                  </button>
                  <button onClick={() => openEditForm(c)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteCampaign(c)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {campaigns.length === 0 && (
              <div className="col-span-3 py-16 text-center text-gray-400">
                <Tags className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Henüz kampanya eklenmemiş</p>
                <p className="text-xs mt-1">İlk kampanyanızı oluşturmak için &quot;Kampanya Ekle&quot; butonunu kullanın</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-over Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 h-full overflow-y-auto shadow-2xl border-l border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingId ? 'Kampanya Düzenle' : 'Yeni Kampanya'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Kampanya Adı" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none" />
              <input value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}
                placeholder="Koşul (örn: 3 KG ve üzeri sucuk alımında)" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none" />
              <input value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })}
                placeholder="Teklif (örn: 500 gr Kavurma Hediye)" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none" />
              <input value={form.targetProduct} onChange={(e) => setForm({ ...form, targetProduct: e.target.value })}
                placeholder="Hedef Ürün (opsiyonel)" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Min Tutar (TL)</label>
                  <input type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                    placeholder="0" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Min Miktar (KG)</label>
                  <input type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
                    placeholder="0" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Başlangıç</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Bitiş</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-indigo-400 outline-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 sticky bottom-0">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300">İptal</button>
              <button onClick={saveCampaign} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all">
                <Save className="w-4 h-4 inline mr-1" /> {editingId ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
