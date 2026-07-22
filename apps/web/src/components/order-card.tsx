'use client';

import type { Order } from '@/store/order-store';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'Yeni Sipariş', color: 'text-yellow-800', bg: 'bg-yellow-50 border-yellow-300' },
  approved: { label: 'Onaylandı', color: 'text-blue-800', bg: 'bg-blue-50 border-blue-300' },
  preparing: { label: 'Hazırlanıyor', color: 'text-indigo-800', bg: 'bg-indigo-50 border-indigo-300' },
  shipped: { label: 'Kargoya Verildi', color: 'text-purple-800', bg: 'bg-purple-50 border-purple-300' },
  completed: { label: 'Tamamlandı', color: 'text-green-800', bg: 'bg-green-50 border-green-300' },
  cancelled: { label: 'İptal', color: 'text-red-800', bg: 'bg-red-50 border-red-300' },
};

function getConfidenceBadge(score: number) {
  if (score >= 90) return { label: `%${score} · İnsan Kontrolü Gerekli Değil`, class: 'bg-green-100 text-green-800 border-green-300' };
  if (score >= 70) return { label: `%${score} · İnsan Kontrolü Öneriliyor`, class: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
  if (score >= 50) return { label: `%${score} · İnsan Kontrolü Gerekli`, class: 'bg-orange-100 text-orange-800 border-orange-300' };
  return { label: `%${score} · Ses Kaydı Dinlenmeli`, class: 'bg-red-100 text-red-800 border-red-300' };
}

export function OrderCard({ order }: { order: Order }) {
  const status = statusConfig[order.status] || statusConfig.new;
  const confidence = getConfidenceBadge(order.confidence);
  const channelIcon = order.channel === 'phone' ? '📞' : order.channel === 'whatsapp' ? '💬' : '✍️';

  return (
    <div className={`border-2 rounded-lg p-4 ${status.bg} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{channelIcon}</span>
            <span className="font-bold text-gray-900">
              {order.customer_name || 'Bilinmiyor'}
            </span>
            <span className="text-sm text-gray-500">
              #{order.order_number}
            </span>
          </div>

          {order.items && order.items.length > 0 && (
            <div className="mt-2 space-y-1">
              {order.items.map((item, i) => (
                <div key={i} className="text-sm text-gray-700">
                  {item.quantity} {item.unit} {item.product_name}
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className="font-semibold">
              {Number(order.total_price).toLocaleString('tr-TR')} TL
            </span>
            {order.customer_phone && (
              <span className="text-gray-500">{order.customer_phone}</span>
            )}
          </div>

          <div className="mt-1 text-xs text-gray-400">
            {new Date(order.created_at).toLocaleTimeString('tr-TR')}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${status.color} bg-white`}>
            {status.label}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${confidence.class}`}>
            {confidence.label}
          </span>
        </div>
      </div>
    </div>
  );
}
