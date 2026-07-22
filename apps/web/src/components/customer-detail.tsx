'use client';

interface CustomerDetailProps {
  customer: Record<string, unknown>;
  orders: Record<string, unknown>[];
  timeline: Record<string, unknown>[];
  complaints: Record<string, unknown>[];
  onRefresh: () => void;
}

function getSegment(customer: Record<string, unknown>, ordersCount: number, totalSpent: number): { label: string; icon: string; color: string } {
  if (totalSpent >= 50000) return { label: 'VIP', icon: '🥇', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
  if (ordersCount >= 10) return { label: 'Sadık', icon: '🥈', color: 'bg-blue-100 text-blue-800 border-blue-300' };
  if (ordersCount <= 1) return { label: 'Yeni', icon: '🟢', color: 'bg-green-100 text-green-800 border-green-300' };
  return { label: 'Aktif', icon: '✅', color: 'bg-gray-100 text-gray-800 border-gray-300' };
}

export function CustomerDetail({ customer, orders, timeline, complaints }: CustomerDetailProps) {
  const totalSpent = orders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const avgBasket = orders.length > 0 ? Math.round(totalSpent / orders.length) : 0;
  const segment = getSegment(customer, orders.length, totalSpent);
  const daysSinceLastOrder = orders.length > 0
    ? Math.floor((Date.now() - new Date(orders[0].created_at as string).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Product frequency
  const productCounts: Record<string, number> = {};
  orders.forEach((o: Record<string, unknown>) => {
    const items = o.items as Record<string, unknown>[] | undefined;
    if (items) items.forEach((item) => {
      const name = (item.product_name as string) || '';
      productCounts[name] = (productCounts[name] || 0) + Number(item.quantity || 0);
    });
  });
  const topProducts = Object.entries(productCounts).sort(([, a], [, b]) => b - a).slice(0, 3);

  // AI Insight
  const insightParts: string[] = [];
  insightParts.push(`Son ${orders.length} sipariş verdi.`);
  insightParts.push(`Ortalama sepet ${avgBasket.toLocaleString('tr-TR')} TL.`);
  if (topProducts.length > 0) insightParts.push(`En çok ${topProducts[0][0]} alıyor.`);
  if (daysSinceLastOrder > 60) insightParts.push(`${daysSinceLastOrder} gündür sipariş vermemiş. Yeniden kazanılabilir.`);
  else if (daysSinceLastOrder <= 7) insightParts.push('Son 7 günde sipariş vermiş, aktif müşteri.');
  if (complaints.length > 0) insightParts.push(`${complaints.length} şikayet kaydı var, öncelikli ilgilenilmeli.`);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👤</span>
            <div>
              <h2 className="text-xl font-bold">{customer.name as string}</h2>
              <p className="text-sm text-gray-500">{customer.phone as string}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${segment.color}`}>{segment.icon} {segment.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3 mt-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-blue-700">{orders.length}</div>
            <div className="text-xs text-blue-600">Sipariş</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-green-700">{totalSpent.toLocaleString('tr-TR')} TL</div>
            <div className="text-xs text-green-600">Toplam Harcama</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-purple-700">{avgBasket.toLocaleString('tr-TR')} TL</div>
            <div className="text-xs text-purple-600">Ort. Sepet</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-amber-700">{daysSinceLastOrder > 999 ? '-' : `${daysSinceLastOrder} gün`}</div>
            <div className="text-xs text-amber-600">Son Sipariş</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-red-700">{complaints.length}</div>
            <div className="text-xs text-red-600">Şikayet</div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="mt-4 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-lg p-3 border border-violet-100">
          <div className="flex items-center gap-1.5 mb-1">
            <span>🤖</span>
            <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">AI Müşteri Analizi</span>
          </div>
          <p className="text-sm text-gray-700">{insightParts.join(' ')}</p>
        </div>

        {/* Top Products */}
        {topProducts.length > 0 && (
          <div className="mt-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">En Çok Aldığı Ürünler</span>
            <div className="flex gap-2 mt-1">
              {topProducts.map(([name, qty], i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700">{name} ×{qty}</span>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4">
          <a href={`tel:${customer.phone}`} target="_blank" className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100">📞 Ara</a>
          <a href={`https://wa.me/${customer.phone}`} target="_blank" className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100">💬 WhatsApp</a>
        </div>
      </div>

      {/* Orders */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">📋 Son Siparişler</h3>
        <div className="space-y-1">
          {orders.map((o) => (
            <div key={o.id as string} className="flex items-center justify-between text-sm py-2 px-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <span className="font-medium">#{(o as Record<string, string>).order_number}</span>
                <span className="text-gray-500">{o.customer_name as string}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{Number(o.total_price || 0).toLocaleString('tr-TR')} TL</span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${o.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{o.status as string}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Complaints */}
      {complaints.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">⚠️ Şikayet Geçmişi</h3>
          <div className="space-y-2">
            {complaints.map((c, i) => {
              const meta = c.metadata as Record<string, unknown> || {};
              return (
                <div key={i} className="text-sm p-2 bg-red-50 rounded border border-red-100">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-red-800">{meta.type as string || c.event_type as string}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${(meta.severity as string) === 'HIGH' ? 'bg-red-200 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{meta.severity as string || 'NORMAL'}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{c.description as string}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(c.created_at as string).toLocaleString('tr-TR')}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">📋 Aktivite Geçmişi</h3>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {timeline.map((entry, i) => (
            <div key={i} className="flex gap-2 text-sm py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-base">{entry.event_icon as string || '📋'}</span>
              <div className="flex-1">
                <p className="text-gray-700 text-xs">{entry.description as string}</p>
                <p className="text-xs text-gray-400">{new Date(entry.created_at as string).toLocaleString('tr-TR')} · {entry.actor_type as string}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
