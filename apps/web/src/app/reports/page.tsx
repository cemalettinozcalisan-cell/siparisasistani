'use client';

import { useEffect, useState } from 'react';

const STATUS_TR: Record<string, string> = {
  PAYMENT_CONFIRMED: 'Ödeme Onaylandı', DELIVERED: 'Teslim Edildi',
  SHIPPED: 'Gönderildi', PACKAGING: 'Paketleniyor', PENDING: 'Beklemede',
  PROCESSING: 'İşleniyor', CANCELLED: 'İptal Edildi', REFUNDED: 'İade Edildi',
  COMPLETED: 'Tamamlandı',
};

export default function ReportsPage() {
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [recentOrders, setRecentOrders] = useState<Record<string, unknown>[]>([]);
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    Promise.all([
      fetch(`/api/dashboard/${tid}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/health/${tid}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/orders-list/${tid}?limit=500`).then(r => r.json()).catch(() => []),
    ]).then(([d, h, orders]) => {
      setStats({ ...d, ...h });
      if (Array.isArray(orders)) setRecentOrders(orders);
    });
  }, []);

  const today = stats.today as Record<string, unknown> || {};
  const channelCounts: Record<string, number> = { phone: 0, whatsapp: 0 };
  const statusCounts: Record<string, number> = {};
  recentOrders.forEach((o: Record<string, unknown>) => {
    const ch = (o.channel as string) || 'phone';
    if (ch === 'phone' || ch === 'whatsapp') channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    const st = (o.status as string) || 'unknown';
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  });
  const totalRevenue = recentOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);

  const downloadPDF = () => {
    const rows = recentOrders.slice(0, 20).map(o => `<tr><td>#${(o as Record<string, string>).order_number}</td><td>${o.customer_name || '-'}</td><td>${Number(o.total_price || 0).toLocaleString('tr-TR')} TL</td><td>${o.channel === 'phone' ? 'Telefon' : 'WhatsApp'}</td><td>${STATUS_TR[o.status as string] || o.status}</td><td>${new Date(o.created_at as string).toLocaleDateString('tr-TR')}</td></tr>`).join('');
    const statusRows = Object.entries(statusCounts).map(([s, c]) => `<tr><td>${STATUS_TR[s] || s}</td><td>${c} sipariş</td></tr>`).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sipariş Raporu</title><style>
      body{font-family:Arial,sans-serif;margin:30px;color:#333}h1{color:#1a56db;border-bottom:2px solid #1a56db;padding-bottom:8px}
      .stats{display:flex;gap:20px;margin:20px 0}.stat{background:#f3f4f6;padding:12px 20px;border-radius:8px;flex:1}
      .stat .label{font-size:12px;color:#6b7280}.stat .value{font-size:22px;font-weight:bold;color:#111827}
      table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
      th{background:#1a56db;color:#fff;padding:8px 10px;text-align:left}
      td{padding:8px 10px;border-bottom:1px solid #e5e7eb}
      h2{margin-top:30px;color:#374151;font-size:16px}
      .footer{margin-top:30px;font-size:11px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:12px}
    </style></head><body>
    <h1>📊 Sipariş Raporu</h1>
    <p style="color:#6b7280;font-size:14px">${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <div class="stats"><div class="stat"><div class="label">Toplam Sipariş</div><div class="value">${recentOrders.length}</div></div><div class="stat"><div class="label">Toplam Ciro</div><div class="value">${totalRevenue.toLocaleString('tr-TR')} TL</div></div></div>
    <h2>📋 Sipariş Durumları</h2><table><thead><tr><th>Durum</th><th>Adet</th></tr></thead><tbody>${statusRows}</tbody></table>
    <h2>📋 Son Siparişler</h2><table><thead><tr><th>Sipariş</th><th>Müşteri</th><th>Tutar</th><th>Kanal</th><th>Durum</th><th>Tarih</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="footer">SiparişAsistanı - Otomatik oluşturulmuştur</div>
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">📊 Raporlar</h1>
      <p className="text-sm text-gray-500">İşletme performansı</p>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Sipariş', value: recentOrders.length, icon: '📦', color: 'from-blue-500 to-blue-600' },
          { label: 'Toplam Ciro', value: `${totalRevenue.toLocaleString('tr-TR')} TL`, icon: '💰', color: 'from-emerald-500 to-emerald-600' },
          { label: 'AI Başarı', value: `%${String(today.aiSuccessRate || 0)}`, icon: '🤖', color: 'from-amber-500 to-amber-600' },
          { label: 'Toplam Görüşme', value: String(today.totalCalls || stats.todayOrders || 0), icon: '📞', color: 'from-purple-500 to-purple-600' },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl p-4 bg-gradient-to-br ${c.color} text-white`}>
            <div className="text-xl">{c.icon}</div>
            <div className="text-xl font-bold mt-1">{String(c.value)}</div>
            <div className="text-xs opacity-90">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">📊 Kanal Dağılımı</h2>
          <div className="space-y-3">
            {[{ icon: '📞', label: 'Telefon', count: channelCounts.phone, color: 'bg-blue-500' },
              { icon: '💬', label: 'WhatsApp', count: channelCounts.whatsapp, color: 'bg-green-500' }
            ].map((c) => (
              <div key={c.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{c.icon} {c.label}</span>
                  <span className="font-medium">{c.count} sipariş</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`${c.color} h-2 rounded-full`} style={{ width: `${recentOrders.length > 0 ? (c.count / recentOrders.length) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">📋 Sipariş Durumları</h2>
          <div className="space-y-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex justify-between text-sm">
                <span className="text-gray-600">{STATUS_TR[status] || status}</span>
                <span className="font-medium">{count} sipariş</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">📋 Son Siparişler</h2>
          <div className="flex gap-2">
            <button onClick={downloadPDF} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100">📄 PDF İndir</button>
            <a href={`/api/export/orders/${tid}`} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100">📥 CSV</a>
            <a href={`/api/export/customers/${tid}`} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100">👥 Müşteri CSV</a>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 pr-4">Sipariş</th>
                <th className="pb-2 pr-4">Müşteri</th>
                <th className="pb-2 pr-4">Tutar</th>
                <th className="pb-2 pr-4">Kanal</th>
                <th className="pb-2 pr-4">Durum</th>
                <th className="pb-2">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.slice(0, 20).map((o) => (
                <tr key={o.id as string} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium">#{(o as Record<string, string>).order_number}</td>
                  <td className="py-2 pr-4">{o.customer_name as string || '-'}</td>
                  <td className="py-2 pr-4">{Number(o.total_price || 0).toLocaleString('tr-TR')} TL</td>
                  <td className="py-2 pr-4">{o.channel === 'phone' ? '📞 Telefon' : '💬 WhatsApp'}</td>
                  <td className="py-2 pr-4">{STATUS_TR[o.status as string] || (o.status as string)}</td>
                  <td className="py-2">{new Date(o.created_at as string).toLocaleDateString('tr-TR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
