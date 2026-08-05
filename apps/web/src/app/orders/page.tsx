'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PhoneCall, MessageCircle, Camera, Globe, MessageSquare, Search, X, Edit3, Trash2, Truck, Eye, Play, Package, AlertTriangle, CheckCircle, Clock, Layers, Volume2, VolumeX, RefreshCw } from 'lucide-react';

function authHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
  } catch { return { 'Content-Type': 'application/json' }; }
}

const CHANNELS = [
  { key: 'all', label: 'Tümü', icon: Layers, color: 'bg-slate-100 text-slate-600' },
  { key: 'PHONE', label: 'Telefon', icon: PhoneCall, color: 'bg-blue-100 text-blue-600' },
  { key: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle, color: 'bg-emerald-100 text-emerald-600' },
  { key: 'SMS', label: 'SMS', icon: MessageSquare, color: 'bg-sky-100 text-sky-600' },
  { key: 'INSTAGRAM', label: 'Instagram', icon: Camera, color: 'bg-pink-100 text-pink-600' },
  { key: 'WEBSITE', label: 'Web', icon: Globe, color: 'bg-indigo-100 text-indigo-600' },
];

const STATUS_TABS = [
  { key: 'all', label: 'Tümü' },
  { key: 'pending', label: '⏳ Beklemede', statuses: ['new', 'processing', 'preparing'] },
  { key: 'approved', label: '✅ Onaylandı', statuses: ['PAYMENT_CONFIRMED', 'PACKAGING', 'PACKAGED', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
  { key: 'payment', label: '💳 Ödeme Bekliyor', statuses: ['PAYMENT_WAITING'] },
  { key: 'cancelled', label: '❌ İptal', statuses: ['CANCELLED'] },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new: { label: 'Yeni', cls: 'bg-blue-100 text-blue-700' },
  PAYMENT_CONFIRMED: { label: 'Ödeme Onaylandı', cls: 'bg-indigo-100 text-indigo-700' },
  PAYMENT_WAITING: { label: 'Ödeme Bekliyor', cls: 'bg-amber-100 text-amber-700' },
  PACKAGING: { label: 'Paketleniyor', cls: 'bg-violet-100 text-violet-700' },
  PACKAGED: { label: 'Paketlendi', cls: 'bg-purple-100 text-purple-700' },
  SHIPPED: { label: 'Kargolandı', cls: 'bg-emerald-100 text-emerald-700' },
  DELIVERED: { label: 'Teslim Edildi', cls: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Tamamlandı', cls: 'bg-teal-100 text-teal-700' },
  CANCELLED: { label: 'İptal', cls: 'bg-red-100 text-red-700' },
  APPROVED: { label: 'Onaylandı', cls: 'bg-emerald-100 text-emerald-700' },
  PROCESSING: { label: 'Hazırlanıyor', cls: 'bg-cyan-100 text-cyan-700' },
  PREPARING: { label: 'Hazırlanıyor', cls: 'bg-cyan-100 text-cyan-700' },
};

const SOURCE_LABELS: Record<string, string> = { PHONE: '📱 Telefon', WHATSAPP: '💬 WhatsApp', SMS: '📲 SMS', INSTAGRAM: '📸 Instagram', WEBSITE: '🌐 Web' };

function TimerBadge({ date }: { date: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const update = () => setElapsed(Math.floor((Date.now() - new Date(date).getTime()) / 1000));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [date]);
  if (elapsed < 60) return <span className="text-[10px] text-gray-400">{elapsed}s</span>;
  if (elapsed < 3600) return <span className="text-[10px] text-gray-400">{Math.floor(elapsed / 60)}dk</span>;
  return <span className="text-[10px] text-gray-400">{Math.floor(elapsed / 3600)}sa</span>;
}

interface Order {
  id: string; order_number: string; total_price: number; status: string; channel: string; source: string;
  notes: string; customer_note: string; created_at: string; customer_name: string; customer_phone: string;
  customer_city: string; customer_address: string; customer_birthday: string; customer_identity: string;
  customer_company: string; items?: Array<{ product_name: string; quantity: number; unit: string; unit_price: number }>;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [items, setItems] = useState<Order['items']>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notification, setNotification] = useState<{ id: string; name: string } | null>(null);
  const [prevIds, setPrevIds] = useState<Set<string>>(new Set());
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [showCargo, setShowCargo] = useState(false);
  const [cargoForm, setCargoForm] = useState({ company: '', tracking: '' });
  const audioCtx = useRef<AudioContext | null>(null);
  const tid = '00000000-0000-0000-0000-000000000001';

  const beep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtx.current) audioCtx.current = new AudioContext();
      const osc = audioCtx.current.createOscillator();
      const gain = audioCtx.current.createGain();
      osc.connect(gain); gain.connect(audioCtx.current.destination);
      osc.frequency.value = 880; gain.gain.value = 0.1;
      osc.start(); osc.stop(audioCtx.current.currentTime + 0.15);
    } catch {}
  }, [soundEnabled]);

  const loadOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (channelFilter !== 'all') params.set('source', channelFilter);
      params.set('limit', '200');
      const res = await fetch(`/api/orders-list/${tid}?${params.toString()}`, { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) {
        const newOrders = data as Order[];
        const newIds = new Set(newOrders.map((o) => o.id));
        if (prevIds.size > 0) {
          for (const o of newOrders) {
            if (!prevIds.has(o.id)) {
              setNotification({ id: o.id, name: o.customer_name || 'Yeni Müşteri' });
              beep();
              setTimeout(() => setNotification(null), 4000);
              break;
            }
          }
        }
        setPrevIds(newIds);
        setOrders(newOrders);
      }
    } catch {}
  }, [channelFilter, prevIds, beep]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const filtered = orders.filter((o) => {
    if (search) {
      const q = search.toLowerCase();
      if (!String(o.order_number || '').toLowerCase().includes(q) && !String(o.customer_name || '').toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all') {
      const tab = STATUS_TABS.find((t) => t.key === statusFilter);
      if (tab?.statuses && !tab.statuses.includes(o.status)) return false;
    }
    return true;
  }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const selectOrder = async (order: Order) => {
    setSelected(order);
    try {
      const res = await fetch(`/api/orders-list/${tid}?q=${order.order_number}`, { headers: authHeaders() });
      const data = await res.json();
      const match = Array.isArray(data) ? data.find((o: Order) => o.id === order.id) : null;
      if (match?.items) setItems(match.items as Order['items']);
      else setItems([]);
    } catch { setItems([]); }
  };

  const updateStatus = async (orderId: string, status: string) => {
    await fetch(`/api/orders/${orderId}/status`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }) });
    loadOrders();
    setSelected(null);
  };

  const handleCargo = async () => {
    if (!selected || !cargoForm.company || !cargoForm.tracking) return;
    await fetch(`/api/orders/${selected.id}/cargo`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ cargo_company: cargoForm.company, tracking_number: cargoForm.tracking }) });
    loadOrders();
    setSelected(null);
    setShowCargo(false);
    setCargoForm({ company: '', tracking: '' });
  };

  const handleEdit = async () => {
    if (!selected) return;
    await fetch(`/api/orders-list/${tid}/${selected.id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(editForm) });
    loadOrders();
    setSelected(null);
    setShowEdit(false);
  };

  const handleDelete = async () => {
    if (!selected || !confirm('Bu siparişi silmek istediğinize emin misiniz?')) return;
    await fetch(`/api/orders-list/${tid}/${selected.id}`, { method: 'DELETE', headers: authHeaders() });
    loadOrders();
    setSelected(null);
  };

  const handleCancel = async () => {
    if (!selected) return;
    await fetch(`/api/orders/${selected.id}/cancel`, { method: 'PATCH', headers: authHeaders() });
    loadOrders();
    setSelected(null);
  };

  const quickAction = (order: Order) => {
    if (order.status === 'new' || order.status === 'PAYMENT_WAITING') return { label: 'Ödeme Onayla', next: 'PAYMENT_CONFIRMED' };
    if (order.status === 'PAYMENT_CONFIRMED') return { label: 'Paketle', next: 'PACKAGING' };
    if (order.status === 'PACKAGING') return { label: 'Paketlendi', next: 'PACKAGED' };
    if (order.status === 'PACKAGED') return { label: 'Kargoya Ver', next: 'SHIPPED' };
    if (order.status === 'SHIPPED') return { label: 'Teslim Edildi', next: 'DELIVERED' };
    return null;
  };

  return (
    <div className="p-4 space-y-3 h-[calc(100vh-2rem)] flex flex-col">
      {/* Header & Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mr-2">Siparişler</h1>
        <span className="text-xs text-gray-400">{filtered.length} sipariş</span>
        <button onClick={() => setSoundEnabled(!soundEnabled)} className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
          {soundEnabled ? <Volume2 size={16} className="text-gray-400" /> : <VolumeX size={16} className="text-gray-300" />}
        </button>
        <button onClick={loadOrders} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
          <RefreshCw size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Channel Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {CHANNELS.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              onClick={() => setChannelFilter(c.key)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                channelFilter === c.key
                  ? `${c.color} ring-1 ring-offset-1 ring-current/20`
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
              }`}>
              <Icon size={13} /> {c.label}
            </button>
          );
        })}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1.5">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === t.key
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Sipariş no veya müşteri adı ile ara..."
          className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-indigo-400 outline-none"
        />
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300 animate-pulse">
          🔔 Yeni sipariş: {notification.name}
        </div>
      )}

      {/* Order Cards Grid */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {filtered.map((o) => {
          const action = quickAction(o);
          const badge = STATUS_BADGE[o.status] || { label: o.status, cls: 'bg-gray-100 text-gray-600' };
          const isNew = o.status === 'new';
          return (
            <div
              key={o.id}
              onClick={() => selectOrder(o)}
              className={`bg-white dark:bg-slate-800 rounded-xl border p-3 cursor-pointer hover:shadow-md transition-all ${
                selected?.id === o.id
                  ? 'ring-2 ring-indigo-400 border-indigo-300 dark:border-indigo-600'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              } ${isNew ? 'border-l-4 border-l-emerald-400' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">#{o.order_number}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                    {SOURCE_LABELS[o.source] && (
                      <span className="text-[10px] text-gray-400">{SOURCE_LABELS[o.source]}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-slate-200 mt-0.5 truncate">{o.customer_name || '—'}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                    <TimerBadge date={o.created_at} />
                    {o.customer_city && <span>📍 {o.customer_city}</span>}
                    {o.customer_note && <span>📝 {o.customer_note.substring(0, 20)}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm text-gray-900 dark:text-white">{Number(o.total_price).toLocaleString('tr-TR')} TL</div>
                  {action && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updateStatus(o.id, action.next); }}
                      className="mt-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-medium hover:bg-indigo-100">
                      {action.label}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">Sipariş bulunamadı</div>
        )}
      </div>

      {/* Slide-over Müşteri Kartı */}
      {selected && (
        <div className="fixed inset-0 z-50" onClick={() => { setSelected(null); setShowEdit(false); setShowCargo(false); }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 py-3 flex items-center justify-between z-10">
              <span className="font-semibold text-gray-900 dark:text-white">Müşteri Detayı</span>
              <button onClick={() => { setSelected(null); setShowEdit(false); setShowCargo(false); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X size={18} /></button>
            </div>

            <div className="p-4 space-y-4">
              {/* Source Badge */}
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ${
                selected.source === 'WHATSAPP' ? 'bg-emerald-100 text-emerald-700' :
                selected.source === 'INSTAGRAM' ? 'bg-pink-100 text-pink-700' :
                selected.source === 'SMS' ? 'bg-sky-100 text-sky-700' :
                selected.source === 'WEBSITE' ? 'bg-indigo-100 text-indigo-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {SOURCE_LABELS[selected.source] || selected.source}
              </div>

              {/* Customer Info */}
              {!showEdit ? (
                <>
                  <div className="space-y-2 text-sm">
                    <div className="font-semibold text-gray-900 dark:text-white text-lg">{selected.customer_name || '—'}</div>
                    {selected.customer_phone && <div className="text-gray-500">📱 {selected.customer_phone}</div>}
                    {selected.customer_address && <div className="text-gray-500">📍 {selected.customer_address}</div>}
                    {selected.customer_city && <div className="text-gray-500">🏙️ {selected.customer_city}</div>}
                  </div>

                  {/* Payment & Identity */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                    {selected.customer_company && <div><span className="text-gray-400">Şirket:</span> <span className="text-gray-700 dark:text-slate-300">{selected.customer_company}</span></div>}
                    {selected.customer_identity && <div><span className="text-gray-400">{selected.customer_company ? 'Vergi No:' : 'TC:'}</span> <span className="text-gray-700 dark:text-slate-300">{selected.customer_identity}</span></div>}
                    {selected.customer_birthday && <div><span className="text-gray-400">Doğum:</span> <span className="text-gray-700 dark:text-slate-300">{selected.customer_birthday}</span></div>}
                  </div>

                  {/* Notes */}
                  {(selected.customer_note || selected.notes) && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                      📝 {selected.customer_note || selected.notes}
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                    <div className="text-xs text-gray-400 mb-1">Sipariş</div>
                    {items && items.length > 0 ? (
                      <div className="space-y-1">
                        {items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700 dark:text-slate-300">{item.quantity} {item.unit} {item.product_name}</span>
                            <span className="text-gray-500">{(item.quantity * item.unit_price).toLocaleString('tr-TR')} TL</span>
                          </div>
                        ))}
                        <div className="border-t pt-1 flex justify-between font-semibold text-sm">
                          <span className="text-gray-700 dark:text-slate-300">Toplam</span>
                          <span className="text-gray-900 dark:text-white">{Number(selected.total_price).toLocaleString('tr-TR')} TL</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{Number(selected.total_price).toLocaleString('tr-TR')} TL</div>
                    )}
                  </div>
                </>
              ) : (
                /* Edit Form */
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Siparişi Düzenle</h3>
                  {['customer_name', 'customer_phone', 'customer_address', 'customer_city', 'customer_company', 'customer_identity', 'customer_birthday', 'customer_note'].map((field) => (
                    <div key={field}>
                      <label className="text-[10px] text-gray-400 block mb-0.5 uppercase">{field.replace('customer_', '')}</label>
                      <input
                        value={editForm[field] || ''}
                        onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={handleEdit} className="flex-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium">Kaydet</button>
                    <button onClick={() => setShowEdit(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-500">İptal</button>
                  </div>
                </div>
              )}

              {/* Cargo Form */}
              {showCargo && (
                <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Kargo Bilgisi</h3>
                  <input value={cargoForm.company} onChange={(e) => setCargoForm({ ...cargoForm, company: e.target.value })}
                    placeholder="Kargo firması (örn: MNG)" className="w-full px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                  <input value={cargoForm.tracking} onChange={(e) => setCargoForm({ ...cargoForm, tracking: e.target.value })}
                    placeholder="Takip numarası" className="w-full px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                  <div className="flex gap-2">
                    <button onClick={handleCargo} className="flex-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium">Kaydet ve Bildirim Gönder</button>
                    <button onClick={() => setShowCargo(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-500">İptal</button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {!showEdit && (
              <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 px-4 py-3 grid grid-cols-3 gap-2">
                <a href={`/replay?order=${selected.id}`} className="inline-flex items-center justify-center gap-1 px-2 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-medium">
                  <Eye size={13} /> Görüşme
                </a>
                <button onClick={() => { setEditForm({ customer_name: selected.customer_name || '', customer_phone: selected.customer_phone || '', customer_address: selected.customer_address || '', customer_city: selected.customer_city || '', customer_company: selected.customer_company || '', customer_identity: selected.customer_identity || '', customer_birthday: selected.customer_birthday || '', customer_note: selected.customer_note || '' }); setShowEdit(true); }} className="inline-flex items-center justify-center gap-1 px-2 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-medium">
                  <Edit3 size={13} /> Düzenle
                </button>
                <button onClick={() => setShowCargo(!showCargo)} className="inline-flex items-center justify-center gap-1 px-2 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-medium">
                  <Truck size={13} /> Kargo
                </button>
                <button onClick={handleCancel} className="inline-flex items-center justify-center gap-1 px-2 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-100 font-medium">
                  <AlertTriangle size={13} /> İptal Et
                </button>
                <button onClick={handleDelete} className="inline-flex items-center justify-center gap-1 px-2 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400 hover:bg-red-100 font-medium">
                  <Trash2 size={13} /> Sil
                </button>
                <a href={`tel:${selected.customer_phone || ''}`} className="inline-flex items-center justify-center gap-1 px-2 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-medium">
                  <PhoneCall size={13} /> Ara
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
