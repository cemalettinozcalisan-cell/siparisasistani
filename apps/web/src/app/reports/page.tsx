'use client';

import { useEffect, useState, useMemo } from 'react';
import { Download, FileText, Package as PackageIcon, PhoneCall, Search, ChevronDown, ShoppingBag, DollarSign, ShoppingCart, Truck, Calendar, MessageCircle, Camera, Globe, TrendingUp, TrendingDown } from 'lucide-react';
import { getTenantId, getUserRole } from '@/lib/tenant';

function authHeaders(): Record<string, string> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

const CHANNEL_CONFIG = [
  { key: 'phone', label: 'Telefon', icon: PhoneCall, gradient: 'from-blue-500 to-blue-600' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, gradient: 'from-emerald-400 to-emerald-600' },
  { key: 'instagram', label: 'Instagram', icon: Camera, gradient: 'from-pink-500 via-purple-500 to-purple-600' },
  { key: 'website', label: 'Web', icon: Globe, gradient: 'from-cyan-500 to-teal-500' },
  { key: 'manual', label: 'Toptan', icon: PackageIcon, gradient: 'from-amber-400 to-orange-500' },
];

const STATUS_CONFIG: Record<string, { label: string; gradient: string }> = {
  DELIVERED: { label: 'Teslim Edildi', gradient: 'from-emerald-500 to-green-600' },
  COMPLETED: { label: 'Tamamlandı', gradient: 'from-emerald-500 to-green-600' },
  SHIPPED: { label: 'Kargolandı', gradient: 'from-blue-500 to-cyan-600' },
  PACKAGED: { label: 'Paketlendi', gradient: 'from-sky-500 to-blue-500' },
  PACKAGING: { label: 'Paketleniyor', gradient: 'from-sky-400 to-blue-400' },
  PROCESSING: { label: 'Hazırlanıyor', gradient: 'from-amber-500 to-yellow-500' },
  PREPARING: { label: 'Hazırlanıyor', gradient: 'from-amber-500 to-yellow-500' },
  APPROVED: { label: 'Onaylandı', gradient: 'from-teal-500 to-cyan-500' },
  PAYMENT_CONFIRMED: { label: 'Ödeme Onaylandı', gradient: 'from-teal-500 to-emerald-500' },
  PAYMENT_WAITING: { label: 'Ödeme Bekliyor', gradient: 'from-orange-500 to-amber-500' },
  NEW: { label: 'Yeni', gradient: 'from-violet-500 to-purple-600' },
  CANCELLED: { label: 'İptal', gradient: 'from-red-500 to-rose-600' },
  REFUNDED: { label: 'İade', gradient: 'from-red-400 to-red-500' },
  PENDING: { label: 'Bekliyor', gradient: 'from-slate-400 to-slate-500' },
};

const DATE_OPTIONS = [
  { key: 'today', label: 'Bugün' }, { key: 'yesterday', label: 'Dün' },
  { key: 'this_week', label: 'Bu Hafta' }, { key: 'this_month', label: 'Bu Ay' },
  { key: 'last_30', label: 'Son 30 Gün' }, { key: 'custom', label: 'Özel Tarih' },
];

function getDateRange(option: string): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  now.setHours(0, 0, 0, 0);
  switch (option) {
    case 'today': return { from: to, to };
    case 'yesterday': { const d = new Date(); d.setDate(d.getDate() - 1); return { from: d.toISOString().split('T')[0], to: d.toISOString().split('T')[0] }; }
    case 'this_week': { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return { from: d.toISOString().split('T')[0], to }; }
    case 'this_month': { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { from: d.toISOString().split('T')[0], to }; }
    case 'last_30': { const d = new Date(); d.setDate(d.getDate() - 30); return { from: d.toISOString().split('T')[0], to }; }
    default: return { from: '', to: '' };
  }
}

export default function ReportsPage() {
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateOption, setDateOption] = useState('last_30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [downloadMsg, setDownloadMsg] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [userRole, setUserRole] = useState('owner');
  const tid = getTenantId();

  useEffect(() => { setUserRole(getUserRole()); }, []);
  const isOwner = userRole === 'owner';

  useEffect(() => {
    setLoading(true);
    const { from, to } = dateOption === 'custom' ? { from: customFrom, to: customTo } : getDateRange(dateOption);
    fetch(`/api/orders-list/${tid}?limit=500`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        const list = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
        if (from) {
          setOrders(list.filter((o) => { const d = String(o.created_at || '').split('T')[0]; return d >= from && d <= (to || from); }));
        } else { setOrders(list); }
        setLoading(false);
      })
      .catch(() => { setOrders([]); setLoading(false); });
  }, [tid, dateOption, customFrom, customTo]);

  const { totalOrders, totalRevenue, channels, statusCounts, avgBasket, topProducts, deliveredCount } = useMemo(() => {
    let rev = 0;
    const ch: Record<string, number> = { phone: 0, whatsapp: 0, instagram: 0, website: 0, manual: 0 };
    const st: Record<string, number> = {};
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    let delivered = 0;
    orders.forEach((o) => {
      rev += Number(o.total_price || 0);
      const channel = String(o.channel || 'phone').toLowerCase();
      ch[channel] = (ch[channel] || 0) + 1;
      const status = String(o.status || 'unknown').toUpperCase();
      st[status] = (st[status] || 0) + 1;
      if (status === 'DELIVERED' || status === 'COMPLETED') delivered++;
      const items = o.items as Record<string, unknown>[] | undefined;
      if (items) {
        items.forEach((item) => {
          const name = String(item.product_name || 'Bilinmeyen');
          const qty = Number(item.quantity || 0);
          const price = Number(item.unit_price || 0) * qty;
          if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 };
          productMap[name].qty += qty;
          productMap[name].revenue += price;
        });
      }
    });
    return {
      totalOrders: orders.length, totalRevenue: rev, channels: ch, statusCounts: st,
      avgBasket: orders.length > 0 ? Math.round(rev / orders.length) : 0,
      topProducts: Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
      deliveredCount: delivered,
    };
  }, [orders]);

  const filteredOrders = search
    ? orders.filter((o) => String(o.order_number || '').toLowerCase().includes(search.toLowerCase()) || String(o.customer_name || '').toLowerCase().includes(search.toLowerCase()))
    : orders;

  const deliveryRate = totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;

  const exportPDF = () => {
    setDownloadMsg('PDF rapor hazırlanıyor...'); setShowExport(false);
    const rows = [...filteredOrders].sort((a, b) => {
      const da = new Date(String(a.created_at)).toDateString();
      const db = new Date(String(b.created_at)).toDateString();
      if (db !== da) return db.localeCompare(da);
      return String(b.order_number || '').localeCompare(String(a.order_number || ''));
    }).slice(0, 50).map((o) => {
      const ch = String(o.channel || 'phone').toLowerCase();
      const cfg = CHANNEL_CONFIG.find((c) => c.key === ch);
      const phone = String((o as any).customer_phone || '');
      const city = String((o as any).customer_city || '');
      const address = String((o as any).customer_address || '');
      const company = String((o as any).customer_company || '');
      const items = (o.items as Record<string, unknown>[])?.map((i: any) => `${i.quantity} ${i.unit} ${i.product_name}`).join(', ') || '';
      const status = String(o.status || '').toUpperCase();
      const stCfg = STATUS_CONFIG[status];
      return `<tr><td>#${o.order_number || ''}</td><td>${o.customer_name || '-'}</td><td>${company || '-'}</td><td>${phone}</td><td>${city}</td><td>${address}</td><td>${items || '-'}</td><td>${Number(o.total_price || 0).toLocaleString('tr-TR')} TL</td><td>${stCfg?.label || status}</td><td>${cfg?.label || ch}</td><td>${new Date(String(o.created_at)).toLocaleDateString('tr-TR')}</td></tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sipariş Raporu</title><style>body{font-family:Arial,sans-serif;margin:20px;color:#333;font-size:12px}h1{color:#4f46e5;border-bottom:2px solid #4f46e5;padding-bottom:6px;font-size:18px}.stats{display:flex;gap:12px;margin:16px 0}.stat{background:#f3f4f6;padding:10px 18px;border-radius:8px;flex:1}.stat .label{font-size:10px;color:#6b7280}.stat .value{font-size:20px;font-weight:bold;color:#111827}table{width:100%;border-collapse:collapse;margin-top:8px;font-size:10px}th{background:#4f46e5;color:#fff;padding:5px 6px;text-align:left}td{padding:4px 6px;border-bottom:1px solid #e5e7eb}.footer{margin-top:20px;font-size:9px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:8px}</style></head><body><h1>Sipariş Raporu</h1><p style="color:#6b7280;font-size:11px">${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p><div class="stats"><div class="stat"><div class="label">Toplam Sipariş</div><div class="value">${totalOrders}</div></div><div class="stat"><div class="label">Toplam Ciro</div><div class="value">${totalRevenue.toLocaleString('tr-TR')} TL</div></div></div><h2 style="margin-top:20px;color:#374151;font-size:14px">Siparişler</h2><table><thead><tr><th>Sipariş</th><th>Müşteri</th><th>Şirket</th><th>Tel</th><th>Şehir</th><th>Adres</th><th>Ürünler</th><th>Tutar</th><th>Durum</th><th>Kanal</th><th>Tarih</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">SiparişAsistanı — Otomatik oluşturulmuştur</div></body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `Siparis_Raporu_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.html`;
    link.click(); URL.revokeObjectURL(url);
    setDownloadMsg('PDF rapor indirildi'); setTimeout(() => setDownloadMsg(''), 3000);
  };

  const downloadCSV = async () => {
    try {
      const res = await fetch(`/api/export/comprehensive/${tid}`, { headers: authHeaders() });
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob); link.download = 'siparis_raporu.csv';
      link.click(); URL.revokeObjectURL(link.href);
      setDownloadMsg('Excel rapor indiriliyor...'); setTimeout(() => setDownloadMsg(''), 3000);
    } catch {}
  };

  const statusEntries = Object.entries(statusCounts).sort(([, a], [, b]) => b - a);
  const maxStatus = statusEntries[0]?.[1] || 1;

  return (
    <div className="p-4 md:p-6 space-y-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={22} className="text-indigo-500" /> Raporlar
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">İşletme performansı ve analizleri</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => { setShowDate(!showDate); setShowExport(false); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-800 transition-colors">
              <Calendar size={14} /> {DATE_OPTIONS.find((d) => d.key === dateOption)?.label || 'Bu Ay'} <ChevronDown size={12} />
            </button>
            {showDate && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 py-1" onClick={() => setShowDate(false)}>
                {DATE_OPTIONS.map((opt) => (
                  <button key={opt.key} onClick={() => { setDateOption(opt.key); setShowDate(false); }}
                    className={`w-full text-left px-3 py-2 text-xs ${dateOption === opt.key ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-gray-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    {opt.label}
                  </button>
                ))}
                {dateOption === 'custom' && (
                  <div className="px-3 pt-2 pb-1 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1 mb-1">
                      <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                        className="flex-1 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                      <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                        className="flex-1 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <button onClick={() => { setShowExport(!showExport); setShowDate(false); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm">
              <Download size={14} /> Dışa Aktar <ChevronDown size={12} />
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 py-1" onClick={() => setShowExport(false)}>
                <button onClick={exportPDF} className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                  <FileText size={14} className="text-red-500" /> PDF Rapor
                </button>
                <button onClick={() => { downloadCSV(); setShowExport(false); }} className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                  <PackageIcon size={14} className="text-emerald-500" /> Excel Rapor
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {downloadMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300 font-medium">{downloadMsg}</div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Sipariş', value: totalOrders, icon: ShoppingBag, iconBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600', trend: '+12', trendUp: true },
          { label: 'Toplam Ciro', value: `${totalRevenue.toLocaleString('tr-TR')} TL`, icon: DollarSign, iconBg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-600', trend: '+8', trendUp: true },
          { label: 'Ortalama Sepet', value: `${avgBasket.toLocaleString('tr-TR')} TL`, icon: ShoppingCart, iconBg: 'bg-violet-50 dark:bg-violet-900/20', iconColor: 'text-violet-600', trend: '+5', trendUp: true },
          { label: 'Teslimat Oranı', value: `%${deliveryRate}`, icon: Truck, iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600', trend: deliveryRate >= 80 ? '+3' : '-2', trendUp: deliveryRate >= 80 },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                <card.icon size={17} className={card.iconColor} />
              </div>
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${card.trendUp ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20'} px-1.5 py-0.5 rounded-full`}>
                {card.trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {card.trend}%
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</div>
            <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Channel + Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Channel Distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 dark:text-slate-200 mb-4 flex items-center gap-2">
            <PhoneCall size={15} className="text-indigo-500" /> Kanal Dağılımı
          </h2>
          <div className="space-y-3">
            {CHANNEL_CONFIG.map((ch) => {
              const ChIcon = ch.icon;
              const count = channels[ch.key] || 0;
              const pct = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
              return (
                <div key={ch.key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white bg-gradient-to-r ${ch.gradient} shadow-sm`}>
                      <ChIcon size={11} /> {ch.label}
                    </span>
                    <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
                      {count} <span className="text-gray-400">({Math.round(pct)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${ch.gradient} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Breakdown — segmented bar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 dark:text-slate-200 mb-4 flex items-center gap-2">
            <PackageIcon size={15} className="text-indigo-500" /> Sipariş Durumları
          </h2>
          {totalOrders > 0 ? (
            <div className="space-y-3">
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 overflow-hidden flex">
                {statusEntries.map(([status, count]) => {
                  const cfg = STATUS_CONFIG[status] || { gradient: 'from-slate-400 to-slate-500' };
                  const pct = (count / totalOrders) * 100;
                  if (pct < 0.5) return null;
                  return <div key={status} className={`h-full bg-gradient-to-r ${cfg.gradient} first:rounded-l-full last:rounded-r-full`} style={{ width: `${pct}%` }} title={`${cfg.label}: ${count}`} />;
                })}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {statusEntries.map(([status, count]) => {
                  const cfg = STATUS_CONFIG[status] || { label: status, gradient: 'from-slate-400 to-slate-500' };
                  const pct = Math.round((count / totalOrders) * 100);
                  return (
                    <div key={status} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${cfg.gradient} shrink-0`} />
                      <span className="text-[10px] text-gray-500 dark:text-slate-400">{cfg.label}</span>
                      <span className="text-[10px] font-semibold text-gray-700 dark:text-slate-300">{count} (%{pct})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Veri yok</p>
          )}
        </div>
      </div>

      {/* Top Products — Owner only */}
      {isOwner && topProducts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 dark:text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-amber-500" /> En Çok Satan Ürünler
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                  <th className="pb-2.5 pr-4 text-[10px] font-semibold uppercase">Ürün</th>
                  <th className="pb-2.5 pr-4 text-[10px] font-semibold uppercase text-right">Miktar</th>
                  <th className="pb-2.5 pr-4 text-[10px] font-semibold uppercase text-right">Ciro</th>
                  <th className="pb-2.5 text-[10px] font-semibold uppercase" style={{ width: '180px' }}>Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                {topProducts.map((p) => {
                  const pct = totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 100) : 0;
                  return (
                    <tr key={p.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="py-2.5 pr-4 text-sm font-medium text-gray-700 dark:text-slate-300">{p.name}</td>
                      <td className="py-2.5 pr-4 text-right text-xs text-gray-600 dark:text-slate-400">{p.qty.toLocaleString('tr-TR')}</td>
                      <td className="py-2.5 pr-4 text-right text-sm font-semibold text-gray-700 dark:text-slate-300">{p.revenue.toLocaleString('tr-TR')} TL</td>
                      <td className="py-2.5" style={{ width: '180px' }}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 w-8 text-right">%{pct}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Orders Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-bold text-gray-700 dark:text-slate-200">Son Siparişler</h2>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Sipariş No veya müşteri ara..."
              className="pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white w-56 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase">Sipariş</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase">Müşteri</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase text-right">Tutar</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase">Kanal</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase">Durum</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {loading && <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">Yükleniyor...</td></tr>}
              {!loading && filteredOrders.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">Sipariş bulunamadı</td></tr>}
              {!loading && filteredOrders.slice(0, 30).map((o) => {
                const channel = String(o.channel || 'phone').toLowerCase();
                const chCfg = CHANNEL_CONFIG.find((c) => c.key === channel) || CHANNEL_CONFIG[0];
                const ChIcon = chCfg.icon;
                const status = String(o.status || '').toUpperCase();
                const stCfg = STATUS_CONFIG[status] || { label: status, gradient: 'from-slate-400 to-slate-500' };
                return (
                  <tr key={String(o.id)} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">#{String(o.order_number || '')}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300">{String(o.customer_name || '—')}</td>
                    <td className="px-4 py-2.5 text-sm text-right font-semibold text-gray-700 dark:text-slate-300">{Number(o.total_price || 0).toLocaleString('tr-TR')} TL</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white bg-gradient-to-r ${chCfg.gradient} shadow-sm`}>
                        <ChIcon size={10} /> {chCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold text-white bg-gradient-to-r ${stCfg.gradient} shadow-sm`}>{stCfg.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{new Date(String(o.created_at)).toLocaleDateString('tr-TR')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
