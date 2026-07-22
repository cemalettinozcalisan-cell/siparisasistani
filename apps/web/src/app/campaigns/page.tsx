'use client';

import { useEffect, useState } from 'react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', condition: '', offer: '', minAmount: '', minQuantity: '', targetProduct: '', startDate: '', endDate: '' });
  const tid = '00000000-0000-0000-0000-000000000001';

  const load = () => {
    fetch(`/api/campaigns/${tid}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setCampaigns(d); }).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    await fetch(`/api/campaigns/${tid}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: form.title, description: form.description, condition: form.condition, offer: form.offer, min_amount: form.minAmount ? Number(form.minAmount) : null, min_quantity: form.minQuantity ? Number(form.minQuantity) : null, target_product: form.targetProduct || null, start_date: form.startDate || null, end_date: form.endDate || null, active: true }),
    });
    setShowForm(false);
    setForm({ title: '', description: '', condition: '', offer: '', minAmount: '', minQuantity: '', targetProduct: '', startDate: '', endDate: '' });
    load();
  };

  const toggleActive = async (id: string) => {
    const c = campaigns.find(x => x.id === id);
    if (!c) return;
    await fetch(`/api/campaigns/${tid}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !c.active }) }).catch(() => {});
    load();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kampanyalar</h1>
          <p className="text-sm text-gray-500 mt-1">AI'nin musteriye onerecegi kampanyalari yonetin</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ Kampanya Ekle</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Kampanya Adi" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input placeholder="Hedef Urun" value={form.targetProduct} onChange={(e) => setForm({ ...form, targetProduct: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input placeholder="Kosul" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input placeholder="Teklif" value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input placeholder="Min Miktar" type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input placeholder="Min Tutar" type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input placeholder="Baslangic" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input placeholder="Bitis" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <button onClick={create} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Kaydet</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {campaigns.map((c) => (
          <div key={c.id as string} className={`rounded-xl border-2 p-4 ${c.active ? 'border-green-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{c.title as string}</h3>
              <button onClick={() => toggleActive(c.id as string)}
                className={`px-2 py-0.5 rounded text-xs font-medium ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                {c.active ? 'AKTIF' : 'PASIF'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-1">🎯 {c.condition as string}</p>
            <p className="text-xs text-gray-500">🎁 {c.offer as string}</p>
            {c.target_product && <p className="text-xs text-blue-500 mt-1">📦 {c.target_product as string}</p>}
            {(c.start_date as string) && <p className="text-xs text-gray-400 mt-1">🗓 {c.start_date as string} → {c.end_date as string}</p>}
          </div>
        ))}
        {campaigns.length === 0 && <div className="col-span-2 text-center py-12 text-gray-400"><p className="text-3xl mb-2">🏷️</p><p>Henuz kampanya eklenmemis</p></div>}
      </div>
    </div>
  );
}
