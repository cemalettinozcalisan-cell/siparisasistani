'use client';

import { useEffect, useState, useMemo } from 'react';
import { Download, FileText, Package, PhoneCall, Search, ChevronDown } from 'lucide-react';
import { getTenantId, getUserRole } from '@/lib/tenant';

function authHeaders(): Record<string, string> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

async function downloadCSV(url: string, filename: string) {
  try {
    const res = await fetch(url, { headers: authHeaders() });
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch {}
}

const STATUS_TR: Record<string, string> = {
  PAYMENT_CONFIRMED: 'Ödeme Onaylandı', DELIVERED: 'Teslim Edildi', SHIPPED: 'Kargolandı',
  PACKAGING: 'Paketleniyor', PACKAGED: 'Paketlendi', PENDING: 'Bekliyor', PROCESSING: 'Hazırlanıyor',
  COMPLETED: 'Tamamlandı', CANCELLED: 'İptal', REFUNDED: 'İade',
  PREPARING: 'Hazırlanıyor', NEW: 'Yeni', APPROVED: 'Onaylandı',
};

const STATUS_COLOR: Record<string, string> = {
  DELIVERED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  SHIPPED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  PACKAGING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  PACKAGED: 'bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
  PREPARING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  PROCESSING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  PENDING: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  NEW: 'bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  APPROVED: 'bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  REFUNDED: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  PAYMENT_CONFIRMED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
};

const DATE_OPTIONS = [
  { key: 'today', label: 'Bugün' },
  { key: 'yesterday', label: 'Dün' },
  { key: 'this_week', label: 'Bu Hafta' },
  { key: 'this_month', label: 'Bu Ay' },
  { key: 'last_30', label: 'Son 30 Gün' },
  { key: 'custom', label: 'Özel Tarih' },
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
  const [downloadMsg, setDownloadMsg] = useState('');
  const [customTo, setCustomTo] = useState('');
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
          const filtered = list.filter((o) => {
            const d = String(o.created_at || '').split('T')[0];
            return d >= from && d <= (to || from);
          });
          setOrders(filtered);
        } else {
          setOrders(list);
        }
        setLoading(false);
      })
      .catch(() => { setOrders([]); setLoading(false); });
  }, [tid, dateOption, customFrom, customTo]);

  // Computed stats
  const { totalOrders, totalRevenue, channels, statusCounts, avgBasket, topProducts, deliveredCount } = useMemo(() => {
    let rev = 0;
    const ch: Record<string, number> = { phone: 0, whatsapp: 0, instagram: 0, website: 0, manual: 0, wholesale: 0 };
    const st: Record<string, number> = {};
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    let delivered = 0;

    orders.forEach((o) => {
      rev += Number(o.total_price || 0);
      const channel = String(o.channel || 'phone').toLowerCase();
      ch[channel] = (ch[channel] || 0) + 1;
      const status = String(o.status || 'unknown');
      st[status] = (st[status] || 0) + 1;
      if (status === 'DELIVERED' || status === 'COMPLETED') delivered++;

      // Product tracking from items
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

    const topProds = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    return {
      totalOrders: orders.length,
      totalRevenue: rev,
      channels: ch,
      statusCounts: st,
      avgBasket: orders.length > 0 ? Math.round(rev / orders.length) : 0,
      topProducts: topProds,
      deliveredCount: delivered,
    };
  }, [orders]);

  const filteredOrders = search
    ? orders.filter((o) =>
      String(o.order_number || '').toLowerCase().includes(search.toLowerCase()) ||
      String(o.customer_name || '').toLowerCase().includes(search.toLowerCase())
    )
    : orders;

  const exportPDF = async () => {
    setDownloadMsg('PDF rapor hazırlanıyor...');
    setShowExport(false);
    const rows = [...filteredOrders].sort((a, b) => {
      const da = new Date(String(a.created_at)).toDateString();
      const db = new Date(String(b.created_at)).toDateString();
      if (db !== da) return db.localeCompare(da);
      return String(b.order_number || '').localeCompare(String(a.order_number || ''));
    }).slice(0, 50).map((o) => {
      const ch = String(o.channel || 'phone').toLowerCase();
      const chLabel = ch === 'phone' ? '📞 Telefon' : ch === 'whatsapp' ? '💬 WhatsApp' : ch === 'instagram' ? '📸 Instagram' : ch === 'website' ? '🌐 Web Sitesi' : ch === 'wholesale' ? '📦 Toptan' : ch;
      const phone = String((o as any).customer_phone || '');
      const city = String((o as any).customer_city || '');
      const address = String((o as any).customer_address || '');
      const company = String((o as any).customer_company || '');
      const items = (o.items as Record<string, unknown>[])?.map((i: any) => `${i.quantity} ${i.unit} ${i.product_name}`).join(', ') || '';
      const birthdayRaw = (o as any).customer_birthday;
      let birthday = '';
      if (birthdayRaw) {
        const d = new Date(String(birthdayRaw));
        birthday = !isNaN(d.getTime()) ? d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : String(birthdayRaw);
      }
      const identity = String((o as any).customer_identity || '');
      return `<tr><td>#${String(o.order_number || '')}</td><td>${o.customer_name || '-'}</td><td>${company || '-'}</td><td>${phone}</td><td>${city}</td><td>${address}</td><td>${items || '-'}</td><td>${Number(o.total_price || 0).toLocaleString('tr-TR')} TL</td><td>${STATUS_TR[String(o.status).toUpperCase()] || o.status}</td><td>${chLabel}</td><td>${new Date(String(o.created_at)).toLocaleDateString('tr-TR')}</td><td>${birthday || '-'}</td><td>${identity || '-'}</td><td>${identity || '-'}</td></tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sipariş Raporu</title><style>
      body{font-family:Arial,sans-serif;margin:20px;color:#333;font-size:12px}h1{color:#4f46e5;border-bottom:2px solid #4f46e5;padding-bottom:6px;font-size:18px}
      .stats{display:flex;gap:12px;margin:16px 0}.stat{background:#f3f4f6;padding:10px 18px;border-radius:8px;flex:1}
      .stat .label{font-size:10px;color:#6b7280}.stat .value{font-size:20px;font-weight:bold;color:#111827}
      table{width:100%;border-collapse:collapse;margin-top:8px;font-size:10px}
      th{background:#4f46e5;color:#fff;padding:5px 6px;text-align:left}td{padding:4px 6px;border-bottom:1px solid #e5e7eb}
      .footer{margin-top:20px;font-size:9px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:8px}
    </style></head><body>
    <h1>📊 Sipariş Raporu</h1><p style="color:#6b7280;font-size:11px">${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <div class="stats"><div class="stat"><div class="label">Toplam Sipariş</div><div class="value">${totalOrders}</div></div><div class="stat"><div class="label">Toplam Ciro</div><div class="value">${totalRevenue.toLocaleString('tr-TR')} TL</div></div></div>
    <h2 style="margin-top:20px;color:#374151;font-size:14px">📋 Siparişler</h2><table><thead><tr><th>Sipariş</th><th>Müşteri</th><th>Şirket</th><th>Tel</th><th>Şehir</th><th>Adres</th><th>Ürünler</th><th>Tutar</th><th>Durum</th><th>Kanal</th><th>Tarih</th><th>Doğum</th><th>TC</th><th>Vergi No</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="footer">SiparişAsistanı — Otomatik oluşturulmuştur</div>
    </body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Siparis_Raporu_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.html`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadMsg('PDF rapor indirildi');
    setTimeout(() => setDownloadMsg(''), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Raporlar</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">İşletme performansı ve analizleri</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Picker */}
          <div className="relative">
            <button onClick={() => { setShowDate(!showDate); setShowExport(false); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              📅 {DATE_OPTIONS.find((d) => d.key === dateOption)?.label || 'Bu Ay'} <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showDate && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 py-1" onClick={() => setShowDate(false)}>
                {DATE_OPTIONS.map((opt) => (
                  <button key={opt.key} onClick={() => { setDateOption(opt.key); setShowDate(false); }}
                    className={`w-full text-left px-3 py-2 text-sm ${dateOption === opt.key ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
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

          {/* Export Dropdown */}
          <div className="relative">
            <button onClick={() => { setShowExport(!showExport); setShowDate(false); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Dışa Aktar <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 py-1" onClick={() => setShowExport(false)}>
                <button onClick={exportPDF} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-500" /> PDF Rapor
                </button>
                <button onClick={() => { downloadCSV(`/api/export/comprehensive/${tid}`, 'siparis_raporu.csv'); setDownloadMsg('Excel rapor indiriliyor...'); setTimeout(() => setDownloadMsg(''), 3000); setShowExport(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-500" /> Excel Rapor
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {downloadMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300">📥 {downloadMsg}</div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Sipariş', value: totalOrders, icon: '📦', color: 'bg-blue-50 text-blue-600', border: 'border-blue-200' },
          { label: 'Toplam Ciro', value: `${totalRevenue.toLocaleString('tr-TR')} TL`, icon: '💰', color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-200' },
          { label: 'Ortalama Sepet', value: `${avgBasket.toLocaleString('tr-TR')} TL`, icon: '🛒', color: 'bg-violet-50 text-violet-600', border: 'border-violet-200' },
          { label: 'Teslimat Oranı', value: `%${totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0}`, icon: '🎯', color: 'bg-amber-50 text-amber-600', border: 'border-amber-200' },
        ].map((card) => (
          <div key={card.label} className={`bg-white dark:bg-slate-800 border ${card.border} rounded-xl p-4 shadow-sm hover:shadow-md transition-all`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">{card.icon}</span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</div>
            <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Channel + Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Channel Distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PhoneCall className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Kanal Dağılımı</h2>
          </div>
          <div className="space-y-3">
            {[
              { icon: '📞', label: 'Telefon', count: channels.phone, color: 'bg-blue-500' },
              { icon: '💬', label: 'WhatsApp', count: channels.whatsapp || 0, color: 'bg-emerald-500' },
              { icon: '📸', label: 'Instagram', count: channels.instagram || 0, color: 'bg-pink-500' },
              { icon: '🌐', label: 'Web Sitesi', count: channels.website || 0, color: 'bg-sky-500' },
              { icon: '📦', label: 'Toptan', count: channels.wholesale || 0, color: 'bg-orange-500' },
            ].map((c) => (
              <div key={c.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-slate-400">{c.icon} {c.label}</span>
                  <span className="font-medium text-gray-700 dark:text-slate-300">{c.count} sipariş ({totalOrders > 0 ? Math.round((c.count / totalOrders) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                  <div className={`${c.color} h-2 rounded-full transition-all`} style={{ width: `${totalOrders > 0 ? (c.count / totalOrders) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Sipariş Durumları</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(statusCounts).sort(([, a], [, b]) => b - a).map(([status, count]) => {
              const tr = STATUS_TR[status.toUpperCase()] || status;
              const color = STATUS_COLOR[status.toUpperCase()] || 'bg-slate-100 text-slate-600';
              return (
                <div key={status} className="flex items-center justify-between">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>{tr}</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-slate-400">{count} sipariş</span>
                </div>
              );
            })}
            {Object.keys(statusCounts).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Veri yok</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Products — Owner only */}
      {isOwner && topProducts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🏆</span>
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">En Çok Satan Ürünler</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                  <th className="pb-2 pr-4 text-[11px] font-semibold uppercase">Ürün</th>
                  <th className="pb-2 pr-4 text-[11px] font-semibold uppercase text-right">Miktar</th>
                  <th className="pb-2 pr-4 text-[11px] font-semibold uppercase text-right">Ciro</th>
                  <th className="pb-2 text-[11px] font-semibold uppercase text-right">Pay</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.name} className="border-b border-slate-50 dark:border-slate-700/30">
                    <td className="py-2 pr-4 font-medium text-gray-700 dark:text-slate-300">{p.name}</td>
                    <td className="py-2 pr-4 text-right text-gray-600 dark:text-slate-400">{p.qty.toLocaleString('tr-TR')}</td>
                    <td className="py-2 pr-4 text-right font-medium text-gray-700 dark:text-slate-300">{p.revenue.toLocaleString('tr-TR')} TL</td>
                    <td className="py-2 text-right text-gray-500">%{totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 100) : 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Orders Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Son Siparişler</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Sipariş No veya müşteri ara..."
              className="pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white w-56 focus:border-indigo-400 outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase">Sipariş</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase">Müşteri</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-right">Tutar</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase">Kanal</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase">Durum</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {loading && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">Yükleniyor...</td></tr>
              )}
              {!loading && filteredOrders.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">Sipariş bulunamadı</td></tr>
              )}
              {!loading && filteredOrders.slice(0, 30).map((o) => {
                const channel = String(o.channel || 'phone').toLowerCase();
                const channelLabel = channel === 'phone' ? '📞 Telefon' : channel === 'whatsapp' ? '💬 WhatsApp' : channel === 'instagram' ? '📸 Instagram' : '🌐 Web';
                const status = String(o.status || '');
                const statusColor = STATUS_COLOR[status.toUpperCase()] || 'bg-slate-100 text-slate-600';
                return (
                  <tr key={String(o.id)} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">#{String(o.order_number || '')}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300">{String(o.customer_name || '—')}</td>
                    <td className="px-4 py-2.5 text-sm text-right font-medium text-gray-700 dark:text-slate-300">{Number(o.total_price || 0).toLocaleString('tr-TR')} TL</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{channelLabel}</td>
                    <td className="px-4 py-2.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor}`}>{STATUS_TR[status.toUpperCase()] || status}</span></td>
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
