'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Edit3, Trash2, Tags, Gift, Clock, ShoppingCart, Calendar, Save, Zap, Send, TrendingUp, Cake, Sparkles, Megaphone, MessageSquare, RefreshCw, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { getTenantId, getUserRole } from '@/lib/tenant';

interface Campaign {
  id: string; title: string; description: string; condition: string; offer: string;
  min_amount: number; min_quantity: number; target_product: string;
  start_date: string; end_date: string; active: boolean; created_at: string;
}

interface WtTemplate {
  id: string; name: string; category: string; language: string; body: string;
  variables: { key: string; label: string }[]; status: string; meta_status?: string;
  rejection_reason?: string; created_at: string;
}

const TEMPLATE_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Taslak', cls: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' },
  pending_review: { label: 'Meta Onayında', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  approved: { label: 'Onaylı', cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  rejected: { label: 'Reddedildi', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
};

const TEMPLATE_CATEGORY: Record<string, string> = {
  MARKETING: 'Pazarlama',
  UTILITY: 'Bilgilendirme',
};

const DISCOUNT_TYPES = [
  { key: 'gift', label: 'Hediye Ürün', icon: Gift, gradient: 'from-pink-500 to-rose-600' },
  { key: 'percent', label: '% İndirim', icon: Tags, gradient: 'from-amber-500 to-orange-500' },
  { key: 'shipping', label: 'Ücretsiz Kargo', icon: ShoppingCart, gradient: 'from-emerald-500 to-green-500' },
];

const AUTOMATION_RULES = [
  { key: 'reorder_reminder_days', label: 'Tekrar Sipariş Hatırlatma', desc: 'Son siparişten sonra müşteriye hatırlatma', icon: Clock, gradient: 'from-blue-500 to-indigo-600', valueKey: 'reorder_reminder_days', suffix: 'gün', type: 'number' as const, defaultVal: 30 },
  { key: 'abandoned_cart_enabled', label: 'Sepeti Terk Eden Müşteri', desc: 'Siparişi yarım bırakan müşteriye hatırlatma', icon: ShoppingCart, gradient: 'from-amber-500 to-orange-500', extraKey: 'abandoned_cart_hours', extraSuffix: 'saat', type: 'toggle' as const },
  { key: 'holiday_campaigns_enabled', label: 'Bayram / Ramazan Kampanyası', desc: 'Özel günlerde otomatik kampanya mesajı', icon: Gift, gradient: 'from-emerald-500 to-teal-600', type: 'toggle' as const },
  { key: 'birthday_reminder_enabled', label: 'Doğum Günü Pazarlama', desc: 'Müşteri doğum gününde özel indirim', icon: Cake, gradient: 'from-pink-500 to-rose-600', type: 'birthday' as const },
];

export default function MarketingPage() {
  const [tab, setTab] = useState<'automation' | 'campaigns' | 'bulk' | 'templates'>('automation');
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<WtTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('owner');
  const [discountType, setDiscountType] = useState('gift');
  const tid = getTenantId();
  const isOwner = userRole === 'owner';

  const [form, setForm] = useState({ title: '', description: '', condition: '', offer: '', minAmount: '', minQuantity: '', targetProduct: '', startDate: '', endDate: '' });

  // Toplu gönderim
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkChannel, setBulkChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [bulkMax, setBulkMax] = useState(500);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<Record<string, unknown> | null>(null);

  // WhatsApp şablonları
  const [wtName, setWtName] = useState('');
  const [wtCategory, setWtCategory] = useState('MARKETING');
  const [wtBody, setWtBody] = useState('');
  const [wtSubmitting, setWtSubmitting] = useState<string | null>(null);
  const [wtMsg, setWtMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  useEffect(() => { setUserRole(getUserRole()); }, []);

  const loadAll = useCallback(async () => {
    try {
      const [sRes, cRes, stRes, tRes] = await Promise.all([
        fetch(`/api/settings/${tid}`).then(r => r.json()),
        fetch(`/api/campaigns/${tid}`).then(r => r.json()),
        fetch(`/api/sales-engine/stats/${tid}`).then(r => r.json()),
        fetch(`/api/whatsapp-templates/${tid}`).then(r => r.json()),
      ]);
      setSettings(sRes);
      if (Array.isArray(cRes)) setCampaigns(cRes);
      setStats(stRes);
      if (Array.isArray(tRes)) setTemplates(tRes);
    } catch (e) { console.error(e); }
  }, [tid]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveSetting = async (key: string, value: unknown) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    try {
      await fetch(`/api/settings/${tid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { setError('Kaydedilemedi'); setSettings(settings); setTimeout(() => setError(''), 3000); }
  };

  const triggerAutomation = async () => {
    try { await fetch(`/api/sales-engine/trigger/${tid}`, { method: 'POST' }); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch { setError('Otomasyon tetiklenemedi.'); setTimeout(() => setError(''), 3000); }
    loadAll();
  };

  const sendBulk = async () => {
    if (!bulkMessage.trim()) { setError('Mesaj boş olamaz.'); setTimeout(() => setError(''), 3000); return; }
    setBulkSending(true); setBulkResult(null);
    try {
      const res = await fetch(`/api/sales-engine/bulk-send/${tid}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: bulkMessage, channel: bulkChannel, maxCustomers: bulkMax }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gönderilemedi');
      setBulkResult(data);
      loadAll();
    } catch (e) { setError(`Gönderim başarısız: ${(e as Error).message}`); setTimeout(() => setError(''), 4000); }
    setBulkSending(false);
  };

  const createTemplate = async () => {
    if (!wtName.trim() || !wtBody.trim()) { setError('Şablon adı ve içerik zorunlu.'); setTimeout(() => setError(''), 3000); return; }
    try {
      await fetch(`/api/whatsapp-templates/${tid}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: wtName, category: wtCategory, language: 'tr', body: wtBody }),
      });
      setWtName(''); setWtBody('');
      loadAll();
    } catch { setError('Şablon kaydedilemedi.'); setTimeout(() => setError(''), 3000); }
  };

  const submitTemplate = async (t: WtTemplate) => {
    setWtSubmitting(t.id); setWtMsg(null);
    try {
      const res = await fetch(`/api/whatsapp-templates/${tid}/${t.id}/submit`, { method: 'POST' });
      const data = await res.json();
      setWtMsg({ id: t.id, text: data.message || 'Gönderildi', ok: res.ok });
      loadAll();
    } catch (e) { setWtMsg({ id: t.id, text: (e as Error).message, ok: false }); }
    setWtSubmitting(null);
  };

  const deleteTemplate = async (t: WtTemplate) => {
    if (!confirm(`"${t.name}" şablonunu silmek istediğinize emin misiniz?`)) return;
    try { await fetch(`/api/whatsapp-templates/${tid}/${t.id}`, { method: 'DELETE' }); loadAll(); }
    catch { setError('Şablon silinemedi.'); setTimeout(() => setError(''), 3000); }
  };

  const openNewForm = () => { setEditingId(null); setDiscountType('gift'); setForm({ title: '', description: '', condition: '', offer: '', minAmount: '', minQuantity: '', targetProduct: '', startDate: '', endDate: '' }); setShowForm(true); };
  const openEditForm = (c: Campaign) => { setEditingId(c.id); setDiscountType('gift'); setForm({ title: c.title, description: c.description || '', condition: c.condition, offer: c.offer, minAmount: String(c.min_amount || ''), minQuantity: String(c.min_quantity || ''), targetProduct: c.target_product || '', startDate: c.start_date ? c.start_date.split('T')[0] : '', endDate: c.end_date ? c.end_date.split('T')[0] : '' }); setShowForm(true); };

  const saveCampaign = async () => {
    const body = { title: form.title, description: form.description, condition: form.condition, offer: form.offer, min_amount: form.minAmount ? Number(form.minAmount) : null, min_quantity: form.minQuantity ? Number(form.minQuantity) : null, target_product: form.targetProduct || null, start_date: form.startDate || null, end_date: form.endDate || null, active: true };
    try {
      if (editingId) { await fetch(`/api/campaigns/${tid}/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
      else { await fetch(`/api/campaigns/${tid}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
      setShowForm(false); loadAll();
    } catch { setError('Kampanya kaydedilemedi.'); setTimeout(() => setError(''), 3000); }
  };

  const toggleCampaign = async (c: Campaign) => {
    try { await fetch(`/api/campaigns/${tid}/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !c.active }) }); loadAll(); }
    catch { setError('Durum değiştirilemedi.'); setTimeout(() => setError(''), 3000); }
  };
  const deleteCampaign = async (c: Campaign) => {
    if (!confirm(`${c.title} kampanyasını silmek istediğinize emin misiniz?`)) return;
    try { await fetch(`/api/campaigns/${tid}/${c.id}`, { method: 'DELETE' }); loadAll(); }
    catch { setError('Kampanya silinemedi.'); setTimeout(() => setError(''), 3000); }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 w-full">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
              <Tags size={16} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pazarlama</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Otomasyon kuralları ve kampanya yönetimi</p>
        </div>
      </div>

      {saved && <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300 font-medium">Kaydedildi</div>}
      {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: 'automation' as const, label: 'Otomatik Satış', icon: Zap },
          { key: 'bulk' as const, label: 'Toplu Gönder', icon: Megaphone },
          { key: 'campaigns' as const, label: 'Özel Kampanyalar', icon: Sparkles },
          { key: 'templates' as const, label: 'WhatsApp Şablonları', icon: MessageSquare },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                tab === t.key ? 'text-white shadow-sm bg-gradient-to-r from-indigo-600 to-violet-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Automation */}
      {tab === 'automation' && (
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Gönderilen', value: String(stats.sent || 0), icon: Send, gradient: 'from-blue-500 to-cyan-600' },
              { label: 'Tekrar Sipariş', value: `%${stats.reorder || 0}`, icon: TrendingUp, gradient: 'from-emerald-500 to-green-600' },
              { label: 'Kurtarılan Sepet', value: String(stats.abandoned_cart || 0), icon: ShoppingCart, gradient: 'from-amber-500 to-orange-600' },
              { label: 'Doğum Günü', value: String(stats.birthday || 0), icon: Cake, gradient: 'from-pink-500 to-rose-600' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                    <kpi.icon size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
                    <p className="text-[10px] text-slate-400">{kpi.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main toggle */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                  <Zap size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">Satış Otomasyonu</p>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">Tüm otomatik kampanya ve hatırlatmaları kontrol eder</p>
                </div>
              </div>
              <Toggle enabled={!!settings.sales_automation_enabled} onChange={(v) => saveSetting('sales_automation_enabled', v)} />
            </div>
          </div>

          {/* Campaign channel */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                <Send size={18} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Kampanya Kanalı</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500">Doğum günü ve bayram mesajları hangi kanaldan gitsin?</p>
              </div>
            </div>
            <select value={String(settings.campaign_channel || 'whatsapp')} onChange={(e) => saveSetting('campaign_channel', e.target.value)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS (NetGSM)</option>
            </select>
          </div>

          {/* Rule Cards */}
          {AUTOMATION_RULES.map((rule) => {
            const RuleIcon = rule.icon;
            const enabled = rule.type === 'birthday' ? !!settings.birthday_reminder_enabled : !!settings[rule.key];
            const onChange = rule.type === 'birthday' ? (v: boolean) => saveSetting('birthday_reminder_enabled', v) : (v: boolean) => saveSetting(rule.key, v);
            return (
            <div key={rule.key} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${rule.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                    <RuleIcon size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{rule.label}</p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500">{rule.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isOwner && (
                    <button onClick={triggerAutomation}
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                      <Zap size={10} className="inline mr-0.5" /> Test Et
                    </button>
                  )}
                  <Toggle enabled={enabled} onChange={onChange} />
                </div>
              </div>
              {enabled && (
                <div className="pl-[52px] space-y-2">
                  {rule.type === 'number' && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">Süre:</span>
                      <input type="number" value={String(settings[rule.valueKey] || rule.defaultVal)}
                        onChange={(e) => saveSetting(rule.valueKey, Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                      <span className="text-[11px] text-gray-400">{rule.suffix}</span>
                    </div>
                  )}
                  {rule.type === 'toggle' && rule.extraKey && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">Süre:</span>
                      <input type="number" value={String(settings[rule.extraKey] || 24)}
                        onChange={(e) => saveSetting(rule.extraKey, Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                      <span className="text-[11px] text-gray-400">{rule.extraSuffix}</span>
                    </div>
                  )}
                  {rule.type === 'birthday' && (
                    <div className="space-y-2 bg-pink-50/50 dark:bg-pink-900/10 rounded-lg p-3 border border-pink-200 dark:border-pink-800">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-gray-500 w-20">İndirim Tipi:</span>
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
                          <span className="text-[11px] text-gray-500 w-20">Değer:</span>
                          <input type="number" value={String(settings.birthday_discount_value || 10)}
                            onChange={(e) => saveSetting('birthday_discount_value', Number(e.target.value))}
                            className="w-20 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                          <span className="text-[11px] text-gray-400">{settings.birthday_discount_type === 'percent' ? '%' : 'TL'}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <span className="text-[11px] text-gray-500 w-20 mt-1">Mesaj:</span>
                        <textarea value={String(settings.birthday_message_template || '')}
                          onChange={(e) => saveSetting('birthday_message_template', e.target.value)}
                          placeholder="İyi ki doğdunuz {name}! Doğum gününüze özel %10 indirim kodunuz: BGUD10"
                          className="flex-1 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white min-h-[50px]" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )})}
        </div>
      )}

      {/* TAB 2: Campaigns */}
      {tab === 'campaigns' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-slate-400">{campaigns.length} kampanya</span>
            <button onClick={openNewForm}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-xs font-semibold transition-all shadow-md">
              <Sparkles size={14} /> Kampanya Ekle
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c) => (
              <div key={c.id} className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm transition-all overflow-hidden ${c.active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-700/50 opacity-60'}`}>
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
                <div className="p-4 flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                    <Gift size={18} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{c.title}</h3>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm shrink-0 ml-2 ${
                        c.active ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-slate-300 dark:bg-slate-600'
                      }`}>{c.active ? 'Aktif' : 'Pasif'}</span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-500 dark:text-slate-400 mb-3">
                      {c.condition && <p className="flex items-center gap-1.5"><Tags size={11} className="text-indigo-400" /> {c.condition}</p>}
                      {c.offer && <p className="flex items-center gap-1.5"><Gift size={11} className="text-rose-400" /> {c.offer}</p>}
                      {c.target_product && <p className="flex items-center gap-1.5"><ShoppingCart size={11} className="text-emerald-500" /> {c.target_product}</p>}
                      {c.start_date && <p className="flex items-center gap-1.5"><Calendar size={11} className="text-slate-400" /> {new Date(c.start_date).toLocaleDateString('tr-TR')} → {c.end_date ? new Date(c.end_date).toLocaleDateString('tr-TR') : '—'}</p>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 pb-3">
                  <button onClick={() => toggleCampaign(c)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${c.active ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'}`}>
                    {c.active ? 'Durdur' : 'Aktif Et'}
                  </button>
                  <button onClick={() => openEditForm(c)}
                    className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all">
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => deleteCampaign(c)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all ml-auto">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {campaigns.length === 0 && (
              <div className="col-span-3 py-16 text-center text-gray-400">
                <Tags size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold text-slate-400">Henüz kampanya eklenmemiş</p>
                <p className="text-xs mt-1">İlk kampanyanızı oluşturmak için "Kampanya Ekle" butonunu kullanın</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Bulk send */}
      {tab === 'bulk' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center shrink-0 shadow-sm">
                <Megaphone size={18} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Tek Seferlik Toplu Gönderim</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500">Tüm müşterilerinize aynı mesajı SMS veya WhatsApp ile gönderin. {`{name}`} yazarsanız müşteri adı ile değiştirilir.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-gray-500 w-24">Kanal:</span>
              <div className="flex gap-2">
                {([['sms', 'SMS (NetGSM)'], ['whatsapp', 'WhatsApp']] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setBulkChannel(k)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${bulkChannel === k ? 'text-white bg-gradient-to-r from-fuchsia-600 to-pink-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Mesaj</label>
              <textarea value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)}
                placeholder={`Merhaba {name}! Bu hafta özel fırsatlarımız var. Detay için arayabilirsiniz.`}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-fuchsia-500/30 outline-none min-h-[100px]" />
              <p className="text-[10px] text-slate-400 mt-1">İpucu: İYS pazarlama izni olmayan müşteriler otomatik olarak atlanır.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-gray-500 w-24">Maks. Kişi:</span>
              <input type="number" value={String(bulkMax)} onChange={(e) => setBulkMax(Number(e.target.value))}
                className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={sendBulk} disabled={bulkSending}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white rounded-lg text-xs font-semibold transition-all shadow-md disabled:opacity-50">
                {bulkSending ? <Clock3 size={14} className="animate-spin" /> : <Send size={14} />}
                {bulkSending ? 'Gönderiliyor...' : 'Gönder'}
              </button>
              {bulkResult && (
                <div className="text-[11px] font-medium space-y-0.5">
                  <p className="text-slate-500">Toplam: <b>{String(bulkResult.total)}</b> · İYS engeli: <b className="text-amber-600">{String(bulkResult.iys_blocked)}</b> · Gönderilen: <b className="text-emerald-600">{String(bulkResult.sent)}</b> · Hata: <b className="text-red-500">{String(bulkResult.failed)}</b></p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WhatsApp templates */}
      {tab === 'templates' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
                <MessageSquare size={18} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Yeni WhatsApp Şablonu</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500">Oluşturup Meta'ya onaya gönderin. Onaylı şablonlar kampanya gönderimlerinde kullanılır.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={wtName} onChange={(e) => setWtName(e.target.value)} placeholder="Şablon adı (örn: ozel_kampanya_1)"
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              <select value={wtCategory} onChange={(e) => setWtCategory(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                <option value="MARKETING">Pazarlama</option>
                <option value="UTILITY">Bilgilendirme</option>
              </select>
            </div>
            <p className="text-[10px] text-slate-400 -mt-1">Pazarlama = indirim/kampanya/yeni ürün mesajı · Bilgilendirme = sipariş/ödeme/kargo bildirimi</p>
            <textarea value={wtBody} onChange={(e) => setWtBody(e.target.value)}
              placeholder={'Mesajınızı yazın. Müşterinin adı otomatik yazılsın isterseniz {{1}} kullanın. Örn: "Merhaba {{1}}, bu hafta sucukta özel indirim var!"'}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white min-h-[80px]" />
            <p className="text-[10px] text-slate-400 -mt-1">{'İpucu: {{1}} = müşterinin adı (gönderimde otomatik dolar) · {{2}}, {{3}}... = ek bilgi için yer tutucu (örn. indirim oranı)'}</p>
            <button onClick={createTemplate}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-semibold transition-all shadow-md">
              <Save size={14} /> Şablon Oluştur
            </button>
          </div>

          <div className="space-y-2">
            {templates.map((t) => {
              const st = TEMPLATE_STATUS[t.status] || TEMPLATE_STATUS.draft;
              return (
                <div key={t.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{t.name}</span>
                        <span className="text-[10px] text-slate-400">{t.language} · {TEMPLATE_CATEGORY[t.category] || t.category}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5 whitespace-pre-wrap">{t.body}</p>
                      {t.status === 'rejected' && t.rejection_reason && (
                        <p className="text-[10px] text-red-500 mt-1">Red nedeni: {t.rejection_reason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {t.status !== 'approved' && (
                        <button onClick={() => submitTemplate(t)} disabled={wtSubmitting === t.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 disabled:opacity-50">
                          {wtSubmitting === t.id ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                          Meta'ya Gönder
                        </button>
                      )}
                      <button onClick={() => deleteTemplate(t)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {wtMsg && wtMsg.id === t.id && (
                    <p className={`mt-2 text-[10px] font-medium ${wtMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{wtMsg.text}</p>
                  )}
                </div>
              );
            })}
            {templates.length === 0 && (
              <div className="py-14 text-center text-gray-400">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold text-slate-400">Henüz WhatsApp şablonu yok</p>
                <p className="text-xs mt-1">Yukarıdan ilk şablonunuzu oluşturun</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-over Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">{editingId ? 'Kampanya Düzenle' : 'Yeni Kampanya'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">İndirim Tipi</label>
                <div className="grid grid-cols-3 gap-2">
                  {DISCOUNT_TYPES.map((dt) => {
                    const DtIcon = dt.icon;
                    const active = discountType === dt.key;
                    return (
                      <button key={dt.key} onClick={() => setDiscountType(dt.key)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                          active ? `border-transparent bg-gradient-to-br ${dt.gradient} text-white shadow-md` : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-200'
                        }`}>
                        <DtIcon size={22} />
                        <span className="text-[10px] font-semibold">{dt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Kampanya Adı" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" />
              <input value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}
                placeholder="Koşul (örn: 3 KG ve üzeri sucuk alımında)" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" />
              <input value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })}
                placeholder="Teklif (örn: 500 gr Kavurma Hediye)" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" />
              <input value={form.targetProduct} onChange={(e) => setForm({ ...form, targetProduct: e.target.value })}
                placeholder="Hedef Ürün (opsiyonel)" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Min Tutar (TL)</label>
                  <input type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                    placeholder="0" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Min Miktar (KG)</label>
                  <input type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
                    placeholder="0" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Başlangıç</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Bitiş</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">İptal</button>
              <button onClick={saveCampaign} className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all">
                <Save size={14} className="inline mr-1" /> {editingId ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
