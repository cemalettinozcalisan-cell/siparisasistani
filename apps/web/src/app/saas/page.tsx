'use client';

import { useEffect, useState } from 'react';
import { CreditCard, BarChart3, Package, PlusCircle, FileText, Check, ChevronRight, AlertTriangle, Shield, Download, Info, Sparkles, TrendingUp, Clock, Calendar, Building2, Zap, Gift, X } from 'lucide-react';
import { getTenantId } from '@/lib/tenant';

const PLANS = [
  { code: 'starter', name: 'Başlangıç Esnaf', price: 6999, orders: 150, gradient: 'from-slate-500 to-slate-700', popular: false },
  { code: 'pro', name: 'Pro Esnaf', price: 9999, orders: 250, gradient: 'from-indigo-500 to-violet-600', popular: true },
  { code: 'ultra', name: 'Ultra Esnaf', price: 12999, orders: 400, gradient: 'from-blue-500 to-cyan-600', popular: false },
  { code: 'mega', name: 'Mega Esnaf', price: 16999, orders: 600, gradient: 'from-amber-500 to-orange-600', popular: false },
  { code: 'premium', name: 'Premium', price: 20999, orders: 900, gradient: 'from-rose-500 to-pink-600', popular: false },
];

const ADDONS = [
  { code: 'addon50', name: '+50 Ek Sipariş', quota: 50, price: 3999, gradient: 'from-emerald-500 to-green-600' },
  { code: 'addon100', name: '+100 Ek Sipariş', quota: 100, price: 6999, gradient: 'from-blue-500 to-indigo-600' },
  { code: 'addon200', name: '+200 Ek Sipariş', quota: 200, price: 11999, gradient: 'from-violet-500 to-purple-600' },
];

const PLAN_FEATURES = [
  'AI Sipariş Alma',
  'Telefon WhatsApp Instagram SMS Web Entegrasyonu',
  'AI Müşteri Tanıma & Adres Hafızası',
  'AI Otomatik Satış & Çapraz Satış Önerileri',
  'Panel & Gelişmiş CRM',
  'Raporlar & AI Satış Analitiği',
  'Pazarlama & Müşteri Sadakat Kampanyaları',
  'KVKK Uyumlu Güvenli Altyapı',
];

const STATUS_TR: Record<string, string> = { active: 'Aktif', pending: 'Beklemede', cancelled: 'İptal', paid: 'Ödendi', unpaid: 'Ödenmedi' };

const TABS = [
  { key: 'subscription', label: 'Abonelik', icon: CreditCard },
  { key: 'usage', label: 'Kullanım', icon: BarChart3 },
  { key: 'plans', label: 'Paketler', icon: Package },
  { key: 'addons', label: 'Ek Paketler', icon: PlusCircle },
  { key: 'invoices', label: 'Fatura & Ödeme', icon: FileText },
];

export default function SaasPage() {
  const [tab, setTab] = useState('subscription');
  const [sub, setSub] = useState<Record<string, unknown> | null>(null);
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null);
  const [invoices, setInvoices] = useState<Record<string, unknown>[]>([]);
  const [contractAccepted, setContractAccepted] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [autoTopup, setAutoTopup] = useState(false);
  const [autoTopupPack, setAutoTopupPack] = useState('addon50');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const tid = getTenantId();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t) setTab(t);
    try { setContractAccepted(localStorage.getItem('contract_accepted') === 'true'); } catch {}
    loadData();
  }, []);

  const loadData = () => {
    Promise.all([
      fetch(`/api/saas/subscription/${tid}`).then(r => r.json()).catch(() => null),
      fetch(`/api/saas/usage/${tid}`).then(r => r.json()).catch(() => null),
      fetch(`/api/saas/invoices/${tid}`).then(r => r.json()).catch(() => []),
    ]).then(([s, u, inv]) => {
      setSub(s as Record<string, unknown>);
      if (u) { setUsage(u); setAutoTopup(!!u.autoTopup); }
      if (Array.isArray(inv)) setInvoices(inv);
    });
  };

  const acceptContract = () => {
    setContractAccepted(true);
    try { localStorage.setItem('contract_accepted', 'true'); } catch {}
  };

  const upgradePlan = async (planCode: string) => {
    await fetch(`/api/saas/upgrade/${tid}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planCode, billingCycle }) });
    loadData();
  };

  const purchaseAddon = async (packCode: string) => {
    await fetch(`/api/saas/purchase-addon/${tid}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packCode }) });
    loadData();
  };

  const currentPlanCode = (sub?.plan as Record<string, unknown>)?.code as string || 'starter';
  const currentPlan = PLANS.find(p => p.code === currentPlanCode) || PLANS[0];
  const remaining = usage ? (usage.remaining as number) : 0;
  const usagePct = usage ? (usage.usagePercent as number) : 0;
  const showWarning = remaining > 0 && remaining <= Math.round((usage?.orderLimit as number || 250) * 0.15);
  const overflowCount = usage?.overflowCount as number || 0;
  const overflowCost = usage?.overflowCost as number || 0;
  const maxOverflow = usage?.maxOverflow as number || 0;
  const showOverflow = overflowCount > 0;

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!enabled)}
      className={`relative w-10 h-5 rounded-full transition-all shrink-0 ${enabled ? 'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-sm' : 'bg-gray-300 dark:bg-slate-600'}`}>
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <div className="p-4 md:p-6 space-y-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles size={22} className="text-indigo-500" /> Abonelik Yönetimi
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Paket, kullanım, fatura ve ödeme yönetimi</p>
        </div>
        {contractAccepted && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-600 shadow-sm">
            <Shield size={12} /> 1 Yıllık Esnek Sözleşme
          </span>
        )}
      </div>

      {/* Contract Acceptance */}
      {!contractAccepted ? (
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/10 dark:to-violet-900/10 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-sm">
              <Shield size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Hizmet Sözleşmesi</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Devam etmek için lütfen SiparişAsistanı hizmet sözleşmesini okuyup onaylayın.</p>
              <div className="flex items-center gap-3 mt-3">
                <button onClick={() => setShowContract(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                  <Shield size={13} /> Sözleşmeyi Oku
                </button>
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={contractAccepted} onChange={(e) => { if (e.target.checked) acceptContract(); }}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  Okudum, anladım ve kabul ediyorum.
                </label>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 shadow-sm w-fit">
          <Check size={12} /> Sözleşme Onaylandı
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                active ? 'text-white shadow-sm bg-gradient-to-r from-indigo-600 to-violet-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}>
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Usage Warning Banner */}
      {showWarning && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 shadow-sm">
            <AlertTriangle size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-300 text-sm">Sipariş kotanız dolmak üzere!</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Sadece <strong>{remaining} sipariş</strong> kaldı. Kota aşımında sipariş başına <strong>80 TL + KDV</strong> ücretlendirilirsiniz. Ek paket alarak tasarruf edin.</p>
          </div>
        </div>
      )}

      {/* TAB: Subscription */}
      {tab === 'subscription' && sub && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {currentPlan.name}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 shadow-sm">
                  <Check size={10} /> Aktif
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{currentPlan.orders.toLocaleString('tr-TR')} sipariş / ay — {currentPlan.price.toLocaleString('tr-TR')} TL</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <Check size={24} className="text-emerald-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Başlangıç</span>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{sub.current_period_start ? new Date(sub.current_period_start as string).toLocaleDateString('tr-TR') : '—'}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Bitiş</span>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{sub.current_period_end ? new Date(sub.current_period_end as string).toLocaleDateString('tr-TR') : '—'}</p>
            </div>
          </div>
        </div>
      )}
      {tab === 'subscription' && !sub && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
            <CreditCard size={28} className="text-indigo-500" />
          </div>
          <p className="font-semibold text-slate-500 dark:text-slate-400">Henüz abonelik bilgisi bulunamadı</p>
          <p className="text-xs text-slate-400 mt-1">Paketler sekmesinden bir plan seçin</p>
        </div>
      )}

      {/* TAB: Usage */}
      {tab === 'usage' && usage && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-500" /> Sipariş Kullanımı
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-bold text-slate-900 dark:text-white">{usage.ordersUsed as number}</span>
                <span className="text-sm text-slate-400 ml-1">/ {usage.orderLimit as number} sipariş</span>
              </div>
              <span className={`text-lg font-bold ${usagePct > 80 ? 'text-red-600' : usagePct > 60 ? 'text-amber-600' : 'text-emerald-600'}`}>
                %{usagePct}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${usagePct > 80 ? 'bg-gradient-to-r from-red-500 to-rose-600' : usagePct > 60 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-indigo-600'}`}
                style={{ width: `${usagePct}%` }} />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="text-xs text-slate-500">{remaining} sipariş hakkınız kaldı</span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Calendar size={11} /> {usage.periodEnd ? new Date(usage.periodEnd as string).toLocaleDateString('tr-TR') : '—'}'e kadar
              </span>
            </div>
          </div>

          {/* Auto-topup */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/20 dark:to-purple-900/20 flex items-center justify-center border border-violet-200 dark:border-violet-800">
                  <Zap size={16} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Otomatik Ek Paket</p>
                  <p className="text-[11px] text-slate-400">Kota bitince otomatik olarak ek sipariş yüklensin</p>
                </div>
              </div>
              <Toggle enabled={autoTopup} onChange={setAutoTopup} />
            </div>
            {autoTopup && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <p className="text-[10px] text-slate-400 mb-2">Kota bittiğinde otomatik yüklenecek paket:</p>
                <select value={autoTopupPack} onChange={(e) => setAutoTopupPack(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none">
                  <option value="addon50">+50 Sipariş (3.999 TL)</option>
                  <option value="addon100">+100 Sipariş (6.999 TL)</option>
                  <option value="addon200">+200 Sipariş (11.999 TL)</option>
                </select>
              </div>
            )}
          </div>

          {/* Overflow Warning */}
          {showOverflow && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 border-2 border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle size={18} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-red-900 dark:text-red-300 text-sm">Kota Aşımı!</p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                  Kotanızı <strong>{overflowCount} sipariş</strong> aştınız. Ay sonu faturanıza <strong>{overflowCost.toLocaleString('tr-TR')} TL + KDV</strong> eklenecek.
                  {maxOverflow > 0 && <> Maksimum aşım: <strong>{maxOverflow} sipariş</strong> (paket limitinin %50'si).</>}
                </p>
                <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">Ek paket alarak 80 TL/sipariş yerine daha düşük birim fiyattan devam edebilirsiniz.</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
            <Info size={12} className="shrink-0 mt-0.5 text-indigo-400" />
            Kullanılmayan siparişler bir sonraki aya devretmez. Her fatura dönemi başında kotanız sıfırlanır.
          </div>
        </div>
      )}
      {tab === 'usage' && !usage && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 text-center">
          <BarChart3 size={28} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 text-sm">Kullanım bilgisi bulunamadı</p>
        </div>
      )}

      {/* TAB: Plans */}
      {tab === 'plans' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 flex-1">
              <Info size={12} className="text-indigo-400 shrink-0" />
              Kullanılmayan siparişler bir sonraki aya devretmez. 1 yıllık taahhüt kapsamında her ay paketinizi değiştirebilirsiniz.
            </div>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0 ml-3">
              <button onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                  billingCycle === 'monthly' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                }`}>
                Aylık
              </button>
              <button onClick={() => setBillingCycle('annual')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                  billingCycle === 'annual' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                }`}>
                Yıllık (%10 İndirim)
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {PLANS.map((plan) => {
              const isCurrent = plan.code === currentPlanCode;
              const isAnnual = billingCycle === 'annual';
              const annualTotal = Math.round(plan.price * 12 * 0.9);
              const annualMonthly = Math.round(annualTotal / 12);
              const displayPrice = isAnnual ? annualTotal : plan.price;
              const displayUnit = isAnnual ? 'TL / Yıl' : 'TL / Ay';
              return (
                <div key={plan.code}
                  className={`rounded-xl border-2 p-5 flex flex-col relative transition-all ${
                    isCurrent ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10 ring-2 ring-indigo-500/30' :
                    plan.popular ? 'border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/20 scale-[1.02]' :
                    'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 hover:shadow-md'
                  }`}>
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[10px] font-bold rounded-full shadow-md flex items-center gap-1">
                      <Sparkles size={10} /> EN POPÜLER
                    </div>
                  )}
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-3 shadow-sm`}>
                    <Package size={16} className="text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{displayPrice.toLocaleString('tr-TR')}</span>
                    <span className="text-xs text-slate-400 ml-1">{displayUnit}</span>
                  </div>
                  {isAnnual && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 shadow-sm">
                        <Check size={9} /> %10 İndirim
                      </span>
                      <span className="text-[10px] text-slate-400">{annualMonthly.toLocaleString('tr-TR')} TL / ay</span>
                    </div>
                  )}
                  {!isAnnual && <div className="text-xs text-slate-400 mt-0.5 font-semibold">{plan.orders} Sipariş</div>}
                  <div className="mt-3 space-y-1.5 flex-1">
                    {PLAN_FEATURES.map((f) => (
                      <div key={f} className="flex items-center gap-1.5 text-[10px]">
                        <Check size={10} className="text-emerald-500 shrink-0" />
                        <span className="text-slate-600 dark:text-slate-400">{f}</span>
                      </div>
                    ))}
                  </div>
                  {isCurrent ? (
                    <div className="mt-4 w-full py-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-sm font-semibold text-center flex items-center justify-center gap-1.5">
                      <Check size={14} /> Aktif Plan
                    </div>
                  ) : (
                    <button onClick={() => upgradePlan(plan.code)}
                      className={`mt-4 w-full py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-sm hover:shadow-md bg-gradient-to-r ${plan.gradient}`}>
                      Geçiş Yap
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: Addons */}
      {tab === 'addons' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ADDONS.map((p) => (
              <div key={p.code} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center mb-3 shadow-sm`}>
                  <PlusCircle size={20} className="text-white" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{p.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">+{p.quota} Ek Sipariş Kotası</p>
                <div className="mt-3">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{p.price.toLocaleString('tr-TR')}</span>
                  <span className="text-xs text-slate-400 ml-1">TL</span>
                </div>
                <button onClick={() => purchaseAddon(p.code)}
                  className="mt-4 w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm">
                  Hemen Yükle
                </button>
              </div>
            ))}
          </div>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-300 text-xs">Ek Paket Kullanım Şartları</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-1 leading-relaxed">
                  Ek paketler ana planınıza anında eklenir. Satın alındığı fatura dönemi içinde geçerlidir, sonraki aya devretmez. Otomatik yenileme özelliğini Kullanım sekmesinden aktif edebilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Invoices & Payment */}
      {tab === 'invoices' && (
        <div className="space-y-4">
          {/* Payment Methods */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Credit Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-sm">
                  <CreditCard size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Kredi Kartı</h3>
                  <p className="text-[10px] text-slate-400">Otomatik aylık ödeme</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex-1">Kartınızı tanımlayın, her ay faturanız otomatik ödensin. PayTR güvenli altyapısı ile.</p>
              <button className="w-full py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg text-xs font-semibold shadow-sm opacity-50 cursor-not-allowed">
                Yakında Aktif
              </button>
            </div>

            {/* Bank Transfer */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-sm">
                  <Building2 size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Banka Havalesi / EFT</h3>
                  <p className="text-[10px] text-slate-400">Manuel ödeme</p>
                </div>
              </div>
              <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 mb-3 flex-1">
                <div className="flex justify-between"><span className="text-slate-400">Banka:</span> <span className="font-medium text-slate-700 dark:text-slate-300">Türkiye İş Bankası</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Alıcı:</span> <span className="font-medium text-slate-700 dark:text-slate-300">SiparişAsistanı Yazılım A.Ş.</span></div>
                <div className="flex justify-between"><span className="text-slate-400">IBAN:</span> <span className="font-medium text-slate-700 dark:text-slate-300 font-mono">TR12 0001 2345 6789 0001 2345 67</span></div>
              </div>
              <button className="w-full py-2 border-2 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                Dekont Yükle / Ödeme Bildir
              </button>
            </div>
          </div>

          {/* Invoices List */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <FileText size={15} className="text-indigo-500" /> Fatura Geçmişi
              </h2>
              <span className="text-xs text-slate-400">{invoices.length} fatura</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {invoices.map((inv) => (
                <div key={inv.id as string} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{(inv as Record<string, string>).invoice_number}</p>
                    <p className="text-xs text-slate-400">{inv.description as string}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      <Calendar size={10} className="inline mr-1" />
                      {new Date(inv.created_at as string).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{Number(inv.amount || 0).toLocaleString('tr-TR')} TL</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        inv.status === 'paid' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' :
                        'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                      }`}>
                        {STATUS_TR[inv.status as string] || (inv.status as string)}
                      </span>
                    </div>
                    <button onClick={() => {
                      const w = window.open('', '_blank'); if (!w) return;
                      w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fatura ${(inv as Record<string, string>).invoice_number}</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#333}h1{color:#4f46e5;border-bottom:2px solid #4f46e5;padding-bottom:8px}.info{background:#f9fafb;padding:16px;border-radius:8px;margin:20px 0;font-size:14px}.info div{margin:4px 0}.amount{font-size:28px;font-weight:bold;color:#111827;text-align:center;margin:30px 0}.footer{margin-top:40px;font-size:11px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:12px}</style></head><body><h1>Fatura</h1><p style="color:#6b7280">Fatura No: ${(inv as Record<string, string>).invoice_number}</p><div class="info"><div><strong>Tarih:</strong> ${new Date(inv.created_at as string).toLocaleDateString('tr-TR')}</div><div><strong>Durum:</strong> ${STATUS_TR[inv.status as string] || inv.status}</div><div><strong>Açıklama:</strong> ${inv.description as string || '-'}</div></div><div class="amount">${Number(inv.amount || 0).toLocaleString('tr-TR')} TL</div><div class="footer">SiparişAsistanı — Otomatik oluşturulmuştur</div><script>window.onload=function(){window.print()}<\/script></body></html>`);
                      w.document.close();
                    }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-1">
                      <Download size={11} /> PDF
                    </button>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && (
                <div className="p-10 text-center">
                  <FileText size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-400">Henüz fatura bulunmuyor</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contract Modal */}
      {showContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowContract(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Shield size={20} className="text-indigo-500" /> Hizmet Sözleşmesi
              </h2>
              <button onClick={() => setShowContract(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p className="text-xs text-slate-400">Son güncelleme: 07.08.2026</p>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Madde 1 — Taraflar</h3>
                <p>İşbu sözleşme, SiparişAsistanı Yazılım A.Ş. ("Hizmet Sağlayıcı") ile sisteme kayıt olan gerçek/tüzel kişi ("Abone") arasında akdedilmiştir.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Madde 2 — Konu</h3>
                <p>Bu sözleşme, Abone'nin SiparişAsistanı AI destekli sipariş yönetim platformunu kullanım koşullarını ve tarafların hak/yükümlülüklerini belirler.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Madde 3 — Süre ve Fesih</h3>
                <p>Sözleşme, Abone'nin dijital onayı ile yürürlüğe girer ve 1 (bir) yıl süreyle geçerlidir. Abone, ilk 14 gün içinde gerekçesiz cayma hakkına sahiptir. Taahhütlü dönemde erken fesih halinde, kalan ayların %50'si cezai şart olarak yansıtılır.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Madde 4 — Paket ve Kota</h3>
                <p>Abone, her fatura dönemi içinde paketini yükseltebilir veya düşürebilir. Yeni paket, bir sonraki fatura döneminde geçerli olur. Kullanılmayan sipariş hakkı sonraki aya devretmez. Ek sipariş paketleri satın alınabilir.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Madde 5 — Ödeme</h3>
                <p>Faturalar aylık olarak düzenlenir. Ödeme, Abone'nin tanımladığı kredi kartından otomatik çekilir veya havale/EFT ile yapılır. Vadesinde ödenmeyen fatura için 7 gün ek süre tanınır, sonrasında hizmet askıya alınır.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Madde 6 — KVKK ve Veri Gizliliği</h3>
                <p>Abone'ye ait müşteri verileri, 6698 sayılı KVKK kapsamında işlenir. Hizmet Sağlayıcı, verileri üçüncü taraflarla paylaşmaz. Abone dilediği zaman veri silme/dışa aktarma talebinde bulunabilir.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Madde 7 — Hizmet Seviyesi</h3>
                <p>Hizmet Sağlayıcı, %99 uptime taahhüt eder. Planlı bakımlar en az 24 saat önceden bildirilir. Mücbir sebepler (doğal afet, siber saldırı vb.) hizmet kesintisi sayılmaz.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Madde 8 — Yürürlük</h3>
                <p>İşbu sözleşme, Abone'nin platform üzerinde "Okudum, anladım ve kabul ediyorum" kutucuğunu işaretlemesi ile dijital olarak yürürlüğe girer ve ıslak imza hükmündedir.</p>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={contractAccepted} onChange={(e) => { if (e.target.checked) acceptContract(); }}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                Okudum, anladım ve kabul ediyorum.
              </label>
              <button onClick={() => setShowContract(false)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg text-xs font-semibold shadow-sm">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
