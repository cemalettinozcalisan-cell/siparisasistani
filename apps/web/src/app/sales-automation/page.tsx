'use client';

import { useEffect, useState } from 'react';
import { Bot, RefreshCw, Bell, Gift, Cake, ShoppingBag, TrendingUp, ToggleLeft, ToggleRight, Plus, Trash2, Save } from 'lucide-react';

export default function SalesAutomationPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([]);
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'reorder', trigger_days: '30', message_template: '', active: true });
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    fetch(`/api/settings/${tid}`).then(r => r.json()).then(d => setSettings(d)).catch(() => {});
    fetch(`/api/sales-engine/campaigns/${tid}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setCampaigns(d); }).catch(() => {});
    fetch(`/api/sales-engine/stats/${tid}`).then(r => r.json()).then(d => setStats(d)).catch(() => {});
  }, []);

  const toggleSetting = (key: string) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    fetch(`/api/settings/${tid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) }).catch(() => {});
  };

  const createCampaign = async () => {
    await fetch(`/api/sales-engine/campaigns/${tid}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, type: form.type, trigger_days: Number(form.trigger_days), message_template: form.message_template, active: form.active }),
    });
    setShowForm(false);
    setForm({ name: '', type: 'reorder', trigger_days: '30', message_template: '', active: true });
    const res = await fetch(`/api/sales-engine/campaigns/${tid}`);
    const d = await res.json();
    if (Array.isArray(d)) setCampaigns(d);
  };

  const deleteCampaign = async (id: string) => {
    await fetch(`/api/sales-engine/campaigns/${tid}/${id}`, { method: 'DELETE' });
    setCampaigns(campaigns.filter((c) => (c as any).id !== id));
  };

  const toggleCampaign = async (c: Record<string, unknown>) => {
    await fetch(`/api/sales-engine/campaigns/${tid}/${c.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !c.active }),
    });
    setCampaigns(campaigns.map((x) => (x as any).id === c.id ? { ...x, active: !c.active } : x));
  };

  const triggerManual = async () => {
    await fetch(`/api/sales-engine/trigger/${tid}`, { method: 'POST' });
    alert('Otomatik hatırlatma tetiklendi!');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Satış Motoru</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Otomatik satış ve hatırlatma kampanyalarını yönetin</p>
        </div>
        <button onClick={triggerManual} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium">
          <RefreshCw className="w-3.5 h-3.5" /> Şimdi Çalıştır
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Toplam Mesaj', value: String((stats as any).total || 0), icon: Bell, color: 'from-blue-500 to-blue-600' },
          { label: 'Gönderilen', value: String((stats as any).sent || 0), icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
          { label: 'Tekrar Sipariş', value: String((stats as any).reorder || 0), icon: ShoppingBag, color: 'from-violet-500 to-violet-600' },
          { label: 'Terk. Sepet', value: String((stats as any).abandoned_cart || 0), icon: Bell, color: 'from-red-500 to-red-600' },
          { label: 'Kampanya', value: String((stats as any).holiday || 0), icon: Gift, color: 'from-amber-500 to-amber-600' },
          { label: 'Doğum Günü', value: String((stats as any).birthday || 0), icon: Cake, color: 'from-pink-500 to-pink-600' },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`rounded-xl p-4 bg-gradient-to-br ${c.color} text-white`}>
              <Icon className="w-5 h-5 mb-1" />
              <div className="text-xl font-bold">{c.value}</div>
              <div className="text-xs opacity-90">{c.label}</div>
            </div>
          );
        })}
      </div>

      {/* Automation Toggles */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Bot className="w-5 h-5" /> Otomatik Satış Kuralları</h2>
        <div className="space-y-3">
          {[
            { key: 'sales_automation_enabled', label: 'AI Satış Motoru', desc: 'Tüm otomatik satış kurallarını etkinleştir', icon: Bot, color: 'text-violet-600' },
            { key: 'reorder_reminder_days', label: 'Tekrar Sipariş Hatırlatma', desc: `${(settings as any).reorder_reminder_days || 30} gün sonra otomatik mesaj`, icon: ShoppingBag, color: 'text-blue-600' },
            { key: 'birthday_reminder_enabled', label: 'Doğum Günü Mesajı', desc: 'Müşterilere doğum günlerinde otomatik kutlama', icon: Cake, color: 'text-pink-600' },
            { key: 'holiday_campaigns_enabled', label: 'Bayram/Ramazan Kampanyaları', desc: 'Bayram ve ramazan öncesi otomatik kampanya', icon: Gift, color: 'text-amber-600' },
            { key: 'abandoned_cart_enabled', label: 'Sepeti Terk Eden Müşteri', desc: `${(settings as any).abandoned_cart_hours || 24} saat sonra hatırlatma`, icon: Bell, color: 'text-red-600' },
          ].map((item) => {
            const Icon = item.icon;
            const isToggle = item.key !== 'reorder_reminder_days' && item.key !== 'abandoned_cart_hours';
            const enabled = settings[item.key] as boolean;
            return (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${item.color}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{item.desc}</p>
                  </div>
                </div>
                {isToggle ? (
                  <button onClick={() => toggleSetting(item.key)} className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                ) : (
                  <input type="number" value={String(settings[item.key] || 30)} onChange={(e) => {
                    const v = { ...settings, [item.key]: Number(e.target.value) };
                    setSettings(v);
                    fetch(`/api/settings/${tid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) }).catch(() => {});
                  }} className="w-16 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-xs text-center bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Campaigns */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Gift className="w-5 h-5" /> Kampanyalar</h2>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium">
            <Plus className="w-3.5 h-3.5" /> Kampanya Ekle
          </button>
        </div>

        {showForm && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <input placeholder="Kampanya adı" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
              <option value="reorder">Tekrar Sipariş</option>
              <option value="holiday">Bayram/Kampanya</option>
              <option value="birthday">Doğum Günü</option>
              <option value="general">Genel</option>
            </select>
            <input placeholder="Kaç gün sonra?" type="number" value={form.trigger_days} onChange={(e) => setForm({ ...form, trigger_days: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-slate-300">Aktif:</label>
              <button onClick={() => setForm({ ...form, active: !form.active })} className={`relative w-9 h-5 rounded-full transition-colors ${form.active ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <textarea placeholder="Mesaj şablonu ({name} = müşteri adı)" value={form.message_template} onChange={(e) => setForm({ ...form, message_template: e.target.value })}
              className="col-span-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white" rows={2} />
            <button onClick={createCampaign} className="col-span-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
              <Save className="w-4 h-4 inline mr-1" /> Kampanyayı Kaydet
            </button>
          </div>
        )}

        <div className="space-y-2">
          {campaigns.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">Henüz kampanya oluşturulmamış</p>
          ) : campaigns.map((c) => (
            <div key={(c as any).id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${(c as any).active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{(c as any).name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">{(c as any).type}</span>
                  {(c as any).trigger_days > 0 && <span className="text-xs text-gray-400">{(c as any).trigger_days} gün</span>}
                </div>
                {(c as any).message_template && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate max-w-md">{(c as any).message_template}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleCampaign(c)} className="text-xs text-gray-400 hover:text-gray-600">
                  {(c as any).active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => deleteCampaign((c as any).id)} className="text-xs text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
