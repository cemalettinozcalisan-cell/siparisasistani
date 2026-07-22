'use client';

const STATUS_FLOW: Record<string, { label: string; icon: string; color: string }> = {
  new: { label: 'Yeni', icon: '🆕', color: 'bg-yellow-100 text-yellow-800' },
  PAYMENT_WAITING: { label: 'Ödeme Bekliyor', icon: '⏳', color: 'bg-orange-100 text-orange-800' },
  PAYMENT_CONFIRMED: { label: 'Ödeme Onaylandı', icon: '✅', color: 'bg-green-100 text-green-800' },
  PACKAGING: { label: 'Paketleniyor', icon: '📦', color: 'bg-indigo-100 text-indigo-800' },
  PACKAGED: { label: 'Paketlendi', icon: '📦', color: 'bg-indigo-100 text-indigo-800' },
  SHIPPED: { label: 'Kargoda', icon: '🚚', color: 'bg-purple-100 text-purple-800' },
  DELIVERED: { label: 'Teslim Edildi', icon: '✅', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'İptal', icon: '❌', color: 'bg-red-100 text-red-800' },
  COMPLETED: { label: 'Tamamlandı', icon: '🎉', color: 'bg-blue-100 text-blue-800' },
};

const QUICK_ACTIONS: Record<string, { next: string; icon: string; label: string }[]> = {
  new: [{ next: 'PAYMENT_CONFIRMED', icon: '✅', label: 'Ödeme Onayla' }],
  PAYMENT_WAITING: [{ next: 'PAYMENT_CONFIRMED', icon: '✅', label: 'Ödeme Onayla' }],
  PAYMENT_CONFIRMED: [{ next: 'PACKAGING', icon: '📦', label: 'Paketlemeye Başla' }],
  PACKAGING: [{ next: 'PACKAGED', icon: '📦', label: 'Paketlendi' }],
  PACKAGED: [{ next: 'SHIPPED', icon: '🚚', label: 'Kargoya Ver' }],
  SHIPPED: [{ next: 'DELIVERED', icon: '✅', label: 'Teslim Edildi' }],
  DELIVERED: [{ next: 'COMPLETED', icon: '🎉', label: 'Tamamla' }],
};

interface OrderDetailProps {
  order: Record<string, unknown>;
  items: Record<string, unknown>[];
  timeline: Record<string, unknown>[];
  onStatusChange: (orderId: string, status: string) => void;
}

export function OrderDetail({ order, items, timeline, onStatusChange }: OrderDetailProps) {
  const sc = STATUS_FLOW[order.status as string] || { label: order.status as string, icon: '📋', color: 'bg-gray-100' };
  const actions = QUICK_ACTIONS[order.status as string] || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Sipariş #{order.order_number as string}</h2>
          <p className="text-xs text-gray-400">{new Date(order.created_at as string).toLocaleString('tr-TR')}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sc.color}`}>{sc.icon} {sc.label}</span>
      </div>

      {/* Quick Actions */}
      {actions.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hızlı İşlemler</label>
          <div className="grid grid-cols-2 gap-1.5">
            {actions.map((a) => (
              <button key={a.next} onClick={() => onStatusChange(order.id as string, a.next)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                {a.icon} {a.label}
              </button>
            ))}
            <button onClick={() => window.open(`tel:${order.customer_phone}`, '_blank')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100">
              📞 Müşteriyi Ara
            </button>
            <button onClick={() => window.open(`https://wa.me/${order.customer_phone}`, '_blank')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
              💬 WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Customer Info */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1.5">
        <div className="flex justify-between"><span className="text-gray-500">Müşteri</span><span className="font-medium">{order.customer_name as string || '-'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Telefon</span><span className="font-medium">{order.customer_phone as string || '-'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Tutar</span><span className="font-medium">{Number(order.total_price || 0).toLocaleString('tr-TR')} TL</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Kanal</span><span className="font-medium">{order.channel === 'phone' ? '📞 Telefon' : '💬 WhatsApp'}</span></div>
      </div>

      {/* Products */}
      {items.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Ürünler</label>
          <div className="space-y-1">
            {items.map((item: Record<string, unknown>, i: number) => (
              <div key={i} className="flex justify-between text-sm bg-white border border-gray-100 rounded-lg px-3 py-2">
                <span className="font-medium">{item.product_name as string}</span>
                <span className="text-gray-500">{item.quantity} {item.unit as string} × {Number(item.unit_price || 0).toLocaleString('tr-TR')} TL</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Timeline</label>
        <div className="space-y-2">
          {timeline.map((entry, i) => (
            <div key={i} className="flex gap-2">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                {i < timeline.length - 1 && <div className="w-px flex-1 bg-blue-200" />}
              </div>
              <div className="pb-2">
                <p className="text-sm text-gray-700">{entry.description as string}</p>
                <p className="text-xs text-gray-400">{new Date(entry.created_at as string).toLocaleString('tr-TR')} · {entry.actor_type as string}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
