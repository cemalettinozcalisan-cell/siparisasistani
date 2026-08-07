'use client';

import { useState } from 'react';
import { MessageSquare, Printer, PhoneCall, MessageCircle, Mic, User, Smartphone, MapPin, Clock, Package } from 'lucide-react';
import { ChatHistoryDrawer } from '@/components/chat-history-drawer';
import { getTenantId } from '@/lib/tenant';

const STATUS_FLOW: Record<string, { label: string; icon: string; color: string }> = {
  new: { label: 'Yeni', icon: '🆕', color: 'bg-blue-100 text-blue-800' },
  PAYMENT_WAITING: { label: 'Ödeme Bekliyor', icon: '⏳', color: 'bg-orange-100 text-orange-800' },
  PAYMENT_CONFIRMED: { label: 'Ödeme Onaylandı', icon: '✅', color: 'bg-emerald-100 text-emerald-800' },
  PACKAGING: { label: 'Paketleniyor', icon: '📦', color: 'bg-amber-100 text-amber-800' },
  PACKAGED: { label: 'Paketlendi', icon: '📦', color: 'bg-indigo-100 text-indigo-800' },
  SHIPPED: { label: 'Kargoda', icon: '🚚', color: 'bg-purple-100 text-purple-800' },
  DELIVERED: { label: 'Teslim Edildi', icon: '✅', color: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'İptal', icon: '❌', color: 'bg-red-100 text-red-800' },
  COMPLETED: { label: 'Tamamlandı', icon: '🎉', color: 'bg-blue-100 text-blue-800' },
};

const SOURCE_BADGES: Record<string, { label: string; icon: string; color: string }> = {
  PHONE: { label: 'Telefon AI', icon: '📞', color: 'bg-blue-100 text-blue-700' },
  WHATSAPP: { label: 'WhatsApp', icon: '💬', color: 'bg-emerald-100 text-emerald-700' },
  INSTAGRAM: { label: 'Instagram', icon: '📸', color: 'bg-pink-100 text-pink-700' },
  WEBSITE: { label: 'Web Sitesi', icon: '🌐', color: 'bg-cyan-100 text-cyan-700' },
  MANUAL: { label: 'Perakende', icon: '🏪', color: 'bg-orange-100 text-orange-700' },
  WHOLESALE: { label: 'Toptan', icon: '📦', color: 'bg-indigo-100 text-indigo-700' },
};

function SourceBadge({ source }: { source: string }) {
  const cfg = SOURCE_BADGES[source] || { label: source, icon: '📋', color: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.color}`}>{cfg.icon} {cfg.label}</span>;
}

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

function AiConfidenceBadge({ label, confidence }: { label: string; confidence?: number }) {
  const color = confidence && confidence > 90 ? 'bg-emerald-100 text-emerald-700' : confidence && confidence > 70 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600';
  return <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>🤖 {label} {confidence ? `%${confidence}` : ''}</span>;
}

export function OrderDetail({ order, items, timeline, onStatusChange }: OrderDetailProps) {
  const sc = STATUS_FLOW[order.status as string] || { label: order.status as string, icon: '📋', color: 'bg-gray-100' };
  const actions = QUICK_ACTIONS[order.status as string] || [];
  const [showChat, setShowChat] = useState(false);
  const [showCargoForm, setShowCargoForm] = useState(false);
  const [cargoCompany, setCargoCompany] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const source = (order.source as string) || '';
  const phone = (order.customer_phone as string) || '';

  const handleCargoSubmit = async () => {
    if (!cargoCompany || !trackingNumber) return;
    await fetch(`/api/orders/${order.id}/cargo`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cargo_company: cargoCompany, tracking_number: trackingNumber }),
    });
    setShowCargoForm(false);
    onStatusChange(order.id as string, 'SHIPPED');
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 overflow-y-auto h-full">
      {showChat && <ChatHistoryDrawer orderId={order.id as string} customerPhone={phone} onClose={() => setShowChat(false)} />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sipariş #{(order as Record<string, string>).order_number}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">{new Date(order.created_at as string).toLocaleString('tr-TR')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <AiConfidenceBadge label="AI Onaylı" confidence={order.ai_confidence as number} />
          {source && <SourceBadge source={source} />}
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${sc.color}`}>{sc.icon} {sc.label}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hızlı İşlemler</label>
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => window.open(`/api/print/render/${getTenantId()}/${order.id}`, '_blank')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors col-span-2">
            <Printer className="w-4 h-4" /> 🖨️ Fiş Yazdır
          </button>
          {actions.map((a) => (
            <button key={a.next} onClick={() => onStatusChange(order.id as string, a.next)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
              {a.icon} {a.label}
            </button>
          ))}
          <button onClick={() => window.open(`tel:${phone}`, '_blank')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors">
            <PhoneCall className="w-4 h-4" /> Ara
          </button>
          <button onClick={() => window.open(`https://wa.me/${phone}`, '_blank')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
        </div>
      </div>

      {/* Customer Info Grid */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 block">Müşteri Bilgileri</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
            <div><p className="text-xs text-slate-400">Müşteri</p><p className="text-sm font-medium text-slate-900 dark:text-white">{order.customer_name as string || '-'}</p></div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0"><Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
            <div><p className="text-xs text-slate-400">Telefon</p><p className="text-sm font-medium text-slate-900 dark:text-white">{phone || '-'}</p></div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-amber-600 dark:text-amber-400" /></div>
            <div>
              <p className="text-xs text-slate-400">Kanal</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {(() => {
                  const ch = (order.channel as string) || '';
                  const src = (order.source as string) || '';
                  if (ch === 'instagram' || src === 'INSTAGRAM') return '📸 Instagram';
                  if (ch === 'website' || src === 'WEBSITE') return '🌐 Web Sitesi';
                  if (ch === 'phone' || src === 'PHONE') return '📞 Telefon';
                  if (ch === 'whatsapp' || src === 'WHATSAPP') return '💬 WhatsApp';
                  if (src === 'WHOLESALE') return '📦 Toptan';
                  if (src === 'MANUAL' || src === 'PERAKENDE') return '🏪 Perakende';
                  return '💬 WhatsApp';
                })()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0"><MapPin className="w-4 h-4 text-violet-600 dark:text-violet-400" /></div>
            <div><p className="text-xs text-slate-400">Adres</p><p className="text-sm font-medium text-slate-900 dark:text-white">{String((order as any).customer_address || '—')}</p></div>
          </div>
        </div>
        {Boolean((order as any).customer_note || (order as any).notes) && (
          <div className="mt-3 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">📝 Teslimat Notu</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{String((order as any).customer_note || (order as any).notes)}</p>
          </div>
        )}
      </div>

      {/* Cargo Tracking */}
      {(order.status === 'PACKAGED' || order.status === 'SHIPPED' || (order as any).cargo_company) && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block flex items-center gap-1.5">🚚 Kargo Takibi</label>
          {(order as any).cargo_company ? (
            <div className="space-y-1">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Firma</span><span className="font-medium text-slate-900 dark:text-white">{(order as any).cargo_company}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Takip No</span><span className="font-medium text-slate-900 dark:text-white">{(order as any).tracking_number}</span></div>
            </div>
          ) : showCargoForm ? (
            <div className="space-y-2">
              <input value={cargoCompany} onChange={e => setCargoCompany(e.target.value)} placeholder="Kargo firması (MNG, Yurtiçi, Aras...)"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              <input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Takip numarası"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              <div className="flex gap-2">
                <button onClick={handleCargoSubmit}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Kaydet ve Bildirim Gönder</button>
                <button onClick={() => setShowCargoForm(false)}
                  className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">İptal</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCargoForm(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
              🚚 Kargo Bilgisi Gir
            </button>
          )}
        </div>
      )}

      {/* Products */}
      {items.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Ürünler</label>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 divide-y divide-slate-200 dark:divide-slate-600">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-white dark:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-300">{String(item.quantity)}</span>
                  <div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{item.product_name as string}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">{String(item.unit || '')}</span>
                  </div>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">{Number(item.unit_price || 0).toLocaleString('tr-TR')} TL</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Timeline */}
      {timeline.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 block flex items-center gap-1.5">
            ⏱ Sipariş Zaman Çizelgesi
          </label>
          <div className="space-y-0">
            {timeline.map((entry, i) => {
              const actor = entry.actor_type as string;
              const channel = (entry.channel as string) || (order.channel as string) || '';
              const eventType = entry.event_type as string || '';
              const iconColor = actor === 'AI' ? 'bg-violet-500' : actor === 'SYSTEM' ? 'bg-amber-500' : 'bg-blue-500';
              const iconBg = actor === 'AI' ? 'bg-violet-50 dark:bg-violet-900/30' : actor === 'SYSTEM' ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-blue-50 dark:bg-blue-900/30';
              return (
                <div key={i} className="flex gap-3 pb-4 relative">
                  {i < timeline.length - 1 && <div className="absolute left-[15px] top-7 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />}
                  <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shrink-0 z-10`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm text-slate-700 dark:text-slate-200">{entry.description as string}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium text-slate-400">{new Date(entry.created_at as string).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className="text-[10px] text-slate-400">{actor === 'AI' ? '🤖 AI' : actor === 'SYSTEM' ? '⚙️ Sistem' : '👤 İnsan'}</span>
                      {channel && <><span className="text-[10px] text-slate-300">·</span><span className="text-[10px] text-slate-400">{channel === 'VOICE' ? '📞' : channel === 'WHATSAPP' ? '💬' : '📋'} {channel}</span></>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setShowChat(true)}
          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-xl text-sm font-medium hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors">
          <MessageSquare className="w-4 h-4" /> Konuşmayı Göster
        </button>
        <button onClick={() => window.open(`/api/print/render/${getTenantId()}/${order.id}`, '_blank')}
          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-xl text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors">
          <Mic className="w-4 h-4" /> Ses Kaydını Dinle
        </button>
      </div>
    </div>
  );
}
