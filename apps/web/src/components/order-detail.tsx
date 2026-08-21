'use client';

import { useState } from 'react';
import { MessageSquare, Printer, PhoneCall, Mic, User, Smartphone, MapPin, Clock, Package, CheckCircle2, Truck, Ban, Sparkles, Globe, ShoppingBag, Pencil } from 'lucide-react';
import { WhatsAppIcon } from '@/components/channel-icons';
import { ChatHistoryDrawer } from '@/components/chat-history-drawer';
import { getTenantId } from '@/lib/tenant';

const STATUS_FLOW: Record<string, { label: string; color: string }> = {
  new: { label: 'Yeni', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  PAYMENT_WAITING: { label: 'Ödeme Bekliyor', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  PAYMENT_CONFIRMED: { label: 'Ödeme Onaylandı', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  PACKAGING: { label: 'Paketleniyor', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  PACKAGED: { label: 'Paketlendi', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' },
  SHIPPED: { label: 'Kargoda', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400' },
  DELIVERED: { label: 'Teslim Edildi', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  CANCELLED: { label: 'İptal', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
  COMPLETED: { label: 'Tamamlandı', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
};

const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  PHONE: { label: 'Telefon', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  WHATSAPP: { label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  INSTAGRAM: { label: 'Instagram', color: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400' },
  WEBSITE: { label: 'Web Sitesi', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400' },
  MANUAL: { label: 'Perakende', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' },
  WHOLESALE: { label: 'Toptan', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' },
};

function SourceBadge({ source }: { source: string }) {
  const cfg = SOURCE_BADGES[source] || { label: source, color: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold ${cfg.color}`}>{cfg.label}</span>;
}

const QUICK_ACTIONS: Record<string, { next: string; icon: any; label: string }[]> = {
  new: [{ next: 'PAYMENT_CONFIRMED', icon: CheckCircle2, label: 'Ödeme Onayla' }],
  PAYMENT_WAITING: [{ next: 'PAYMENT_CONFIRMED', icon: CheckCircle2, label: 'Ödeme Onayla' }],
  PAYMENT_CONFIRMED: [{ next: 'PACKAGING', icon: Package, label: 'Paketlemeye Başla' }],
  PACKAGING: [{ next: 'PACKAGED', icon: Package, label: 'Paketlendi' }],
  PACKAGED: [{ next: 'SHIPPED', icon: Truck, label: 'Kargoya Ver' }],
  SHIPPED: [{ next: 'DELIVERED', icon: CheckCircle2, label: 'Teslim Edildi' }],
  DELIVERED: [{ next: 'COMPLETED', icon: CheckCircle2, label: 'Tamamla' }],
};

interface OrderDetailProps {
  order: Record<string, unknown>;
  items: Record<string, unknown>[];
  timeline: Record<string, unknown>[];
  onStatusChange: (orderId: string, status: string) => void;
}

function AiConfidenceBadge({ label, confidence }: { label: string; confidence?: number }) {
  const color = confidence && confidence > 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : confidence && confidence > 70 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  return <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold ${color}`}><Sparkles size={11} /> {label} {confidence ? `%${confidence}` : ''}</span>;
}

export function OrderDetail({ order, items, timeline, onStatusChange }: OrderDetailProps) {
  const sc = STATUS_FLOW[order.status as string] || { label: order.status as string, color: 'bg-gray-100 text-gray-600' };
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
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sc.color}`}>{sc.label}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500">Hızlı İşlemler</label>
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => window.open(`/api/print/render/${getTenantId()}/${order.id}`, '_blank')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors col-span-2">
            <Printer className="w-4 h-4" /> Fiş Yazdır
          </button>
          {actions.map((a) => {
            const ActionIcon = a.icon;
            return (
            <button key={a.next} onClick={() => onStatusChange(order.id as string, a.next)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
              <ActionIcon className="w-3.5 h-3.5" /> {a.label}
            </button>
            );
          })}
          <button onClick={() => window.open(`tel:${phone}`, '_blank')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors">
            <PhoneCall className="w-4 h-4" /> Ara
          </button>
          <button onClick={() => window.open(`https://wa.me/${phone}`, '_blank')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors">
            <WhatsAppIcon size={16} /> WhatsApp
          </button>
        </div>
      </div>

      {/* Customer Info Grid */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <label className="text-xs font-bold text-slate-500 mb-3 block">Müşteri Bilgileri</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
            <div><p className="text-xs text-slate-400">Müşteri</p><p className="text-xs font-bold text-slate-900 dark:text-white">{order.customer_name as string || '-'}</p></div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0"><Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
            <div><p className="text-xs text-slate-400">Telefon</p><p className="text-xs font-bold text-slate-900 dark:text-white">{phone || '-'}</p></div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-amber-600 dark:text-amber-400" /></div>
            <div>
              <p className="text-xs text-slate-400">Kanal</p>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {(() => {
                  const src = (order.source as string) || '';
                  const map: Record<string, string> = { INSTAGRAM: 'Instagram', WEBSITE: 'Web Sitesi', PHONE: 'Telefon', WHATSAPP: 'WhatsApp', WHOLESALE: 'Toptan', MANUAL: 'Perakende' };
                  return map[src] || 'WhatsApp';
                })()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0"><MapPin className="w-4 h-4 text-violet-600 dark:text-violet-400" /></div>
            <div><p className="text-xs text-slate-400">Adres</p><p className="text-xs font-bold text-slate-900 dark:text-white">{String((order as any).customer_address || '—')}</p></div>
          </div>
        </div>
        {Boolean((order as any).customer_note || (order as any).notes) && (
          <div className="mt-3 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300"><Pencil size={12} className="inline mr-1" />Teslimat Notu</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{String((order as any).customer_note || (order as any).notes)}</p>
          </div>
        )}
      </div>

      {/* Cargo Tracking */}
      {(order.status === 'PACKAGED' || order.status === 'SHIPPED' || (order as any).cargo_company) && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <label className="text-xs font-bold text-slate-500 mb-2 block"><Truck size={14} className="inline mr-1" />Kargo Takibi</label>
          {(order as any).cargo_company ? (
            <div className="space-y-1">
              <div className="flex justify-between text-xs"><span className="text-slate-500">Firma</span><span className="font-bold text-slate-900 dark:text-white">{(order as any).cargo_company}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-500">Takip No</span><span className="font-bold text-slate-900 dark:text-white">{(order as any).tracking_number}</span></div>
            </div>
          ) : showCargoForm ? (
            <div className="space-y-2">
              <input value={cargoCompany} onChange={e => setCargoCompany(e.target.value)} placeholder="Kargo firması (MNG, Yurtiçi, Aras...)"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              <input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Takip numarası"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              <div className="flex gap-2">
                <button onClick={handleCargoSubmit}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors">Kaydet ve Bildirim Gönder</button>
                <button onClick={() => setShowCargoForm(false)}
                  className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700">İptal</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCargoForm(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
              <Truck size={14} /> Kargo Bilgisi Gir
            </button>
          )}
        </div>
      )}

      {/* Products */}
      {items.length > 0 && (
        <div>
          <label className="text-xs font-bold text-slate-500 mb-2 block">Ürünler</label>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 divide-y divide-slate-200 dark:divide-slate-600">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-white dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-300">{String(item.quantity)}</span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{item.product_name as string}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">{String(item.unit || '')}</span>
                  </div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{Number(item.unit_price || 0).toLocaleString('tr-TR')} TL</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Timeline */}
      {timeline.length > 0 && (
        <div>
          <label className="text-xs font-bold text-slate-500 mb-3 block"><Clock size={14} className="inline mr-1" />Sipariş Zaman Çizelgesi</label>
          <div className="space-y-0">
            {timeline.map((entry, i) => {
              const actor = entry.actor_type as string;
              const channel = (entry.channel as string) || (order.channel as string) || '';
              const iconColor = actor === 'AI' ? 'bg-violet-500' : actor === 'SYSTEM' ? 'bg-amber-500' : 'bg-blue-500';
              const iconBg = actor === 'AI' ? 'bg-violet-50 dark:bg-violet-900/30' : actor === 'SYSTEM' ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-blue-50 dark:bg-blue-900/30';
              const actorLabel = actor === 'AI' ? 'AI' : actor === 'SYSTEM' ? 'Sistem' : 'İnsan';
              return (
                <div key={i} className="flex gap-3 pb-4 relative">
                  {i < timeline.length - 1 && <div className="absolute left-[15px] top-7 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />}
                  <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shrink-0 z-10`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-xs text-slate-700 dark:text-slate-200">{entry.description as string}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{new Date(entry.created_at as string).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{actorLabel}</span>
                      {channel && <><span className="text-xs text-slate-300">·</span><span className="text-xs text-slate-400">{channel}</span></>}
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
          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-xl text-xs font-bold hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors">
          <MessageSquare className="w-4 h-4" /> Konuşmayı Göster
        </button>
        <button onClick={() => window.open(`/api/print/render/${getTenantId()}/${order.id}`, '_blank')}
          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors">
          <Printer className="w-4 h-4" /> Fiş Yazdır
        </button>
      </div>
    </div>
  );
}
