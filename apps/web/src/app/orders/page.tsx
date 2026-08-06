'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PhoneCall, MessageCircle, Camera, Globe, MessageSquare, Search, X, Edit3, Trash2, Truck, Eye, AlertTriangle, Volume2, VolumeX, RefreshCw, Printer, Filter, MapPin } from 'lucide-react';
import { ChatHistoryDrawer } from '@/components/chat-history-drawer';

function authHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
  } catch { return { 'Content-Type': 'application/json' }; }
}

// Status labels: API returns English status keys (PAYMENT_CONFIRMED, SHIPPED, etc.)
// STATUS_BADGE maps them to Turkish display labels automatically
const CHANNELS = [
  { key: 'PHONE', label: 'Telefon', icon: PhoneCall, cls: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' },
  { key: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle, cls: 'bg-gradient-to-r from-emerald-400 to-emerald-600 text-white shadow-md' },
  { key: 'INSTAGRAM', label: 'Instagram', icon: Camera, cls: 'bg-gradient-to-r from-pink-500 via-purple-500 to-purple-600 text-white shadow-md' },
  { key: 'SMS', label: 'SMS', icon: MessageSquare, cls: 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md' },
  { key: 'WEBSITE', label: 'Web', icon: Globe, cls: 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md' },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new: { label: '🆕 Yeni', cls: 'bg-blue-100 text-blue-700' },
  PAYMENT_WAITING: { label: '💳 Ödeme Bekliyor', cls: 'bg-amber-100 text-amber-700' },
  PAYMENT_CONFIRMED: { label: '✅ Onaylandı', cls: 'bg-emerald-100 text-emerald-700' },
  PACKAGING: { label: '✅ Onaylandı', cls: 'bg-emerald-100 text-emerald-700' },
  PACKAGED: { label: '✅ Onaylandı', cls: 'bg-emerald-100 text-emerald-700' },
  SHIPPED: { label: '✅ Onaylandı', cls: 'bg-emerald-100 text-emerald-700' },
  DELIVERED: { label: '✅ Onaylandı', cls: 'bg-emerald-100 text-emerald-700' },
  COMPLETED: { label: '✅ Onaylandı', cls: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: '❌ İptal', cls: 'bg-red-100 text-red-700' },
  APPROVED: { label: '✅ Onaylandı', cls: 'bg-emerald-100 text-emerald-700' },
  PROCESSING: { label: '✅ Onaylandı', cls: 'bg-emerald-100 text-emerald-700' },
  PREPARING: { label: '✅ Onaylandı', cls: 'bg-emerald-100 text-emerald-700' },
};

const ACTIVE_STATUSES = ['new', 'PAYMENT_WAITING'];
const HISTORY_STATUSES = ['PAYMENT_CONFIRMED', 'PACKAGING', 'PACKAGED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'APPROVED', 'PROCESSING', 'PREPARING'];

const PAYMENT_LABELS: Record<string, string> = {
  IBAN: '🏦 IBAN', 'Kapıda Nakit': '💵 Kapıda Nakit', 'Kapıda Kredi Kartı': '💳 Kapıda Kart',
  'Link ile Ödeme': '🔗 Link', CASH: '💵 Nakit', CARD: '💳 Kart',
};

const EDIT_FIELDS: { key: string; label: string }[] = [
  { key: 'customer_name', label: 'Müşteri Ad Soyad' },
  { key: 'customer_phone', label: 'Telefon' },
  { key: 'customer_city', label: 'Şehir' },
  { key: 'customer_address', label: 'Adres' },
  { key: 'customer_company', label: 'Firma' },
  { key: 'tax_office', label: 'Vergi Dairesi' },
  { key: 'customer_identity', label: 'TCKN / VKN' },
  { key: 'customer_note', label: 'Sipariş Notu' },
];

type OrderItem = { product_name: string; quantity: number; unit: string; unit_price: number };

interface Order {
  id: string; order_number: string; total_price: number; status: string; channel: string; source: string;
  notes: string; customer_note: string; created_at: string; customer_name: string; customer_phone: string;
  customer_city: string; customer_address: string; customer_birthday: string; customer_identity: string;
  customer_company: string; tax_office?: string; payment?: string; items?: OrderItem[];
}

function TimerBadge({ date }: { date: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const update = () => setElapsed(Math.floor((Date.now() - new Date(date).getTime()) / 1000));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [date]);
  if (elapsed < 60) return <span>{elapsed}s</span>;
  if (elapsed < 3600) return <span>{Math.floor(elapsed / 60)}dk</span>;
  return <span>{Math.floor(elapsed / 3600)}sa</span>;
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-400">Yükleniyor...</div>}>
      <OrdersPageContent />
    </Suspense>
  );
}

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'active';
  const [activeTab, setActiveTab] = useState<'active' | 'history'>(initialTab === 'history' ? 'history' : 'active');
  const [orders, setOrders] = useState<Order[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notification, setNotification] = useState<{ id: string; name: string } | null>(null);
  const [prevIds, setPrevIds] = useState<Set<string>>(new Set());
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [showCargo, setShowCargo] = useState(false);
  const [cargoForm, setCargoForm] = useState({ company: '', tracking: '' });
  const [showChat, setShowChat] = useState(false);
  const [products, setProducts] = useState<Array<{ productName: string; unit: string; price: number }>>([]);
  const [productSearch, setProductSearch] = useState<Record<number, { open: boolean; query: string }>>({});
  const audioCtx = useRef<AudioContext | null>(null);
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    fetch(`/api/products/${tid}`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setProducts(d.map((p: any) => ({
        productName: p.product_name || p.name || '', unit: p.unit || 'KG', price: Number(p.price || 0),
      })));
    }).catch(() => {});
  }, []);

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
      if (filterChannel !== 'all') params.set('source', filterChannel);
      params.set('limit', '500');
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
  }, [filterChannel, prevIds, beep]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  // Sync tab from sidebar clicks (URL changes but component doesn't re-mount)
  useEffect(() => { const tab = searchParams.get('tab') || 'active'; setActiveTab(tab === 'history' ? 'history' : 'active'); }, [searchParams]);

  const loadOrderItems = async (order: Order) => {
    // Check if items already exist on the order
    if (order.items && order.items.length > 0) {
      setItems(order.items);
      return;
    }
    // Fetch items from API
    try {
      const res = await fetch(`/api/order-items/${order.id}`, { headers: authHeaders() });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
  };

  const selectOrder = (order: Order) => {
    setSelected(order);
    loadOrderItems(order);
  };

  const handleApproveAndShip = async () => {
    if (!selected || !cargoForm.company || !cargoForm.tracking) return;
    await fetch(`/api/orders/${selected.id}/status`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status: 'PAYMENT_CONFIRMED' }) });
    await fetch(`/api/orders/${selected.id}/cargo`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ cargo_company: cargoForm.company, tracking_number: cargoForm.tracking }) });
    loadOrders();
    setSelected(null);
    setShowCargo(false);
    setCargoForm({ company: '', tracking: '' });
  };

  const handleRevise = async () => {
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
    if (!confirm('Bu sipariş iptal edilecektir. Onaylıyor musunuz?')) return;
    await fetch(`/api/orders/${selected.id}/cancel`, { method: 'PATCH', headers: authHeaders() });
    loadOrders();
    setSelected(null);
  };

      const handlePrint = () => {
    if (!selected) return;
    window.open(`/api/print/render/${tid}/${selected.id}`, '_blank');
  };

  const closeSlide = () => { setSelected(null); setShowEdit(false); setShowCargo(false); setItems([]); };

  const openEdit = () => {
    setEditForm({
      customer_name: selected?.customer_name || '', customer_phone: selected?.customer_phone || '',
      customer_city: selected?.customer_city || '', customer_address: selected?.customer_address || '',
      customer_company: selected?.customer_company || '', tax_office: selected?.tax_office || '',
      customer_identity: selected?.customer_identity || '', customer_note: selected?.customer_note || '',
    });
    setEditItems(items.length > 0 ? [...items] : [{ product_name: '', quantity: 1, unit: 'KG', unit_price: 0 }]);
    setShowEdit(true);
  };

  const isActive = (status: string) => ACTIVE_STATUSES.includes(status);
  const isHistory = (status: string) => HISTORY_STATUSES.includes(status);

  const filtered = orders.filter((o) => {
    if (activeTab === 'active' && !isActive(o.status)) return false;
    if (activeTab === 'history' && !isHistory(o.status)) return false;
    if (filterStatus !== 'all') {
      if (filterStatus === 'payment' && o.status !== 'PAYMENT_WAITING') return false;
      if (filterStatus === 'approved' && o.status === 'CANCELLED') return false;
      if (filterStatus === 'cancelled' && o.status !== 'CANCELLED') return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!String(o.order_number || '').toLowerCase().includes(q) && !String(o.customer_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const displayOrders = activeTab === 'active'
    ? filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="p-4 space-y-3 h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {activeTab === 'active' ? '⚡ Aktif Siparişler' : '📜 Geçmiş Siparişler'}
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{displayOrders.length} sipariş</span>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            {soundEnabled ? <Volume2 size={16} className="text-gray-400" /> : <VolumeX size={16} className="text-gray-300" />}
          </button>
          <button onClick={loadOrders} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <RefreshCw size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Channel badges + Filter + Search */}
      <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm">
        {CHANNELS.map((c) => {
          const Icon = c.icon;
          const isActive = filterChannel === c.key;
          return (
            <button key={c.key} onClick={() => setFilterChannel(isActive ? 'all' : c.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${c.cls} ${isActive ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-white/50 scale-105' : ''}`}>
              <Icon size={15} /> {c.label}
            </button>
          );
        })}
        <div className="relative">
          <button onClick={() => setShowFilter(!showFilter)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all shadow-sm ${
              filterStatus !== 'all' || filterChannel !== 'all' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500'
            }`}>
            <Filter size={12} /> Filtrele
          </button>
          {showFilter && (
            <div className="absolute top-full mt-1 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 z-20 min-w-[200px]" onMouseLeave={() => setShowFilter(false)}>
              <div className="text-[10px] text-gray-400 uppercase font-semibold mb-1.5">Durum</div>
              <div className="space-y-1">
                {(activeTab === 'active'
                  ? [{ key: 'all', label: 'Tümü' }, { key: 'payment', label: '💳 Ödeme Bekliyor' }]
                  : [{ key: 'all', label: 'Tümü' }, { key: 'approved', label: '✅ Onaylananlar' }, { key: 'cancelled', label: '❌ İptal Edilenler' }]
                ).map((s) => (
                  <button key={s.key} onClick={() => { setFilterStatus(s.key); setShowFilter(false); }}
                    className={`block w-full text-left px-2 py-1 rounded text-xs font-medium ${filterStatus === s.key ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}>{s.label}</button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="relative flex-1 min-w-[140px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="No veya isim ara..."
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-full text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-indigo-400 outline-none" />
        </div>
      </div>

      {notification && (
        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300 animate-pulse">
          🔔 Yeni sipariş: {notification.name}
        </div>
      )}

      {/* Order Cards */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {displayOrders.map((o) => {
          const badge = STATUS_BADGE[o.status] || { label: o.status, cls: 'bg-gray-100 text-gray-600' };
          const chCfg = CHANNELS.find((c) => c.key === o.source);
          const ChIcon = chCfg?.icon || Globe;
          const pmLabel = o.payment ? PAYMENT_LABELS[o.payment] || `💳 ${o.payment}` : '';
          return (
            <div key={o.id} onClick={() => selectOrder(o)}
              className={`bg-white dark:bg-slate-800 rounded-xl border px-4 py-3 cursor-pointer hover:shadow-md transition-all ${
                selected?.id === o.id ? 'ring-2 ring-indigo-400 border-indigo-300 dark:border-indigo-600' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              } ${o.status === 'new' ? 'border-l-4 border-l-emerald-400' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-sm text-gray-900 dark:text-white shrink-0">#{o.order_number}</span>
                  {chCfg && (<span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${chCfg.cls}`}><ChIcon size={14} /> {chCfg.label}</span>)}
                  <span className="text-sm text-gray-700 dark:text-slate-200 truncate">{o.customer_name || '—'}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pmLabel && <span className="text-[11px] text-gray-500 shrink-0">{pmLabel}</span>}
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                  <span className="font-semibold text-base text-gray-900 dark:text-white">{Number(o.total_price).toLocaleString('tr-TR')} TL</span>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                <TimerBadge date={o.created_at} />
                {o.customer_city && <span className="flex items-center gap-0.5"><MapPin size={11} /> {o.customer_city}</span>}
                {o.customer_note && <span className="text-amber-500 truncate">📝 {o.customer_note.substring(0, 30)}</span>}
              </div>
            </div>
          );
        })}
        {displayOrders.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            {activeTab === 'active' ? 'Aktif sipariş yok 🎉' : 'Geçmiş sipariş bulunamadı'}
          </div>
        )}
      </div>

      {/* Slide-over */}
      {selected && (
        <div className="fixed inset-0 z-50" onClick={closeSlide}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 py-3 flex items-center justify-between z-10">
              <span className="font-semibold text-gray-900 dark:text-white">#{selected.order_number}</span>
              <button onClick={closeSlide} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X size={18} /></button>
            </div>

            <div className="p-4 space-y-4">
              {!showEdit ? (
                <>
                  <div className="space-y-2 text-sm">
                    <div className="font-semibold text-gray-900 dark:text-white text-lg">{selected.customer_name || '—'}</div>
                    {selected.customer_phone && <div className="text-gray-500">📱 {selected.customer_phone}</div>}
                    {selected.customer_address && <div className="text-gray-500"><MapPin size={14} className="inline mr-1" />{selected.customer_address}</div>}
                    {selected.customer_city && <div className="text-gray-500">🏙️ {selected.customer_city}</div>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                    {selected.customer_company && <div><span className="text-gray-400">Firma:</span> <span className="text-gray-700 dark:text-slate-300">{selected.customer_company}</span></div>}
                    {selected.customer_identity && <div><span className="text-gray-400">{selected.customer_company ? 'VKN:' : 'TCKN:'}</span> <span className="text-gray-700 dark:text-slate-300">{selected.customer_identity}</span></div>}
                    {selected.tax_office && <div><span className="text-gray-400">Vergi D.:</span> <span className="text-gray-700 dark:text-slate-300">{selected.tax_office}</span></div>}
                  </div>
                  {(selected.customer_note || selected.notes) && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300">📝 {selected.customer_note || selected.notes}</div>
                  )}

                  <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                    <div className="text-xs text-gray-400 mb-1">Sipariş Kalemleri</div>
                    {items.length > 0 ? (
                      <div className="space-y-1 mb-2">
                        {items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700 dark:text-slate-300">{item.quantity}x {item.unit} {item.product_name}</span>
                            <span className="text-gray-500">{(item.quantity * item.unit_price).toLocaleString('tr-TR')} TL</span>
                          </div>
                        ))}
                        <div className="border-t pt-1 flex justify-between font-semibold text-sm">
                          <span>Toplam</span>
                          <span className="text-gray-900 dark:text-white">{Number(selected.total_price).toLocaleString('tr-TR')} TL</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Ürün bilgisi yüklenemedi — sayfayı yenileyip tekrar deneyin</div>
                    )}
                  </div>

                  {/* Cargo Form (active only) */}
                  {showCargo && activeTab === 'active' && (
                    <div className="space-y-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                      <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Kargo Bilgisi</h3>
                      <input value={cargoForm.company} onChange={(e) => setCargoForm({ ...cargoForm, company: e.target.value })} placeholder="Kargo firması (örn: MNG)" className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900" />
                      <input value={cargoForm.tracking} onChange={(e) => setCargoForm({ ...cargoForm, tracking: e.target.value })} placeholder="Takip numarası" className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900" />
                      <button onClick={handleApproveAndShip} className="w-full px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-emerald-500/20">✅ Ödemeyi Onayla & Kargoya Ver</button>
                    </div>
                  )}
                  {/* Cargo Form (history - revise only) */}
                  {showCargo && activeTab === 'history' && (
                    <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300">Kargo Bilgisini Düzelt</h3>
                      <input value={cargoForm.company} onChange={(e) => setCargoForm({ ...cargoForm, company: e.target.value })} placeholder="Kargo firması" className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900" />
                      <input value={cargoForm.tracking} onChange={(e) => setCargoForm({ ...cargoForm, tracking: e.target.value })} placeholder="Takip numarası" className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900" />
                      <button onClick={handleRevise} className="w-full px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-amber-500/20">🔄 Kargo Bilgisini Güncelle</button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Siparişi Düzenle</h3>
                  {EDIT_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-[10px] text-gray-400 block mb-0.5">{label}</label>
                      <input value={editForm[key] || ''} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                    </div>
                  ))}
                  {/* Products readonly */}
                  {editItems.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-gray-400">Sipariş Kalemleri</label>
                        <button
                          onClick={() => setEditItems([...editItems, { product_name: '', quantity: 1, unit: 'KG', unit_price: 0 }])}
                          className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium">
                          + Ürün Ekle
                        </button>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 rounded p-2 space-y-1.5">
                        {editItems.map((item, i) => {
                          const subtotal = (item.quantity || 0) * (item.unit_price || 0);
                          return (
                            <div key={i} className="space-y-1">
                              <div className="flex items-center gap-1 text-xs">
                                <select
                                  value={item.product_name}
                                  onChange={(e) => {
                                    const sel = products.find(p => p.productName === e.target.value);
                                    const next = [...editItems];
                                    next[i] = { ...next[i], product_name: e.target.value, unit: sel?.unit || 'KG', unit_price: sel?.price || 0 };
                                    setEditItems(next);
                                  }}
                                  className="flex-1 px-1.5 py-1 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                                  <option value="">-- Ürün Seçin --</option>
                                  {products.map(p => (
                                    <option key={p.productName} value={p.productName}>{p.productName} ({p.price.toLocaleString('tr-TR')} TL/{p.unit})</option>
                                  ))}
                                </select>
                                <input type="number" min="1" value={item.quantity}
                                  onChange={(e) => { const next = [...editItems]; next[i] = { ...next[i], quantity: Number(e.target.value) || 1 }; setEditItems(next); }}
                                  className="w-12 px-1 py-1 border border-slate-200 dark:border-slate-600 rounded text-center text-xs bg-white dark:bg-slate-900" title="Miktar" />
                                <span className="text-[10px] text-gray-500 w-8 text-center">{item.unit || 'KG'}</span>
                                <input type="number" min="0" value={item.unit_price}
                                  onChange={(e) => { const next = [...editItems]; next[i] = { ...next[i], unit_price: Number(e.target.value) || 0 }; setEditItems(next); }}
                                  className="w-16 px-1 py-1 border border-slate-200 dark:border-slate-600 rounded text-center text-xs bg-white dark:bg-slate-900" title="Birim fiyat" />
                                <span className="text-gray-400 text-[10px]">TL</span>
                                {editItems.length > 1 && (
                                  <button onClick={() => setEditItems(editItems.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 ml-0.5" title="Sil"><X size={12} /></button>
                                )}
                              </div>
                              <div className="flex justify-end text-[10px] text-gray-400">Ara Toplam: {(subtotal).toLocaleString('tr-TR')} TL</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 text-center -mt-1">
                    <div className="text-[10px] text-indigo-400 uppercase tracking-wide">Sipariş Genel Toplamı</div>
                    <div className="text-xl font-bold text-indigo-600 dark:text-indigo-300">
                      {editItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0).toLocaleString('tr-TR')} TL
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleEdit} className="flex-1 px-3 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-indigo-500/20">Kaydet</button>
                    <button onClick={() => setShowEdit(false)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-500">İptal</button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Buttons */}
            {!showEdit && (
              <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 px-4 py-3 grid grid-cols-4 gap-2">
                <button onClick={() => setShowChat(true)}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-medium">
                  <Eye size={13} /> Görüşme
                </button>
                <button onClick={openEdit}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-medium">
                  <Edit3 size={13} /> Düzenle
                </button>
                <button onClick={handlePrint}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 rounded-lg text-xs text-indigo-600 dark:text-indigo-400 hover:shadow font-medium">
                  <Printer size={13} /> Yazdır
                </button>
                {activeTab === 'active' ? (
                  <button onClick={() => setShowCargo(!showCargo)}
                    className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium ${showCargo ? 'bg-emerald-100 text-emerald-700' : 'bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 text-emerald-600 dark:text-emerald-400'} hover:shadow`}>
                    <Truck size={13} /> Öde&Kargo
                  </button>
                ) : (
                  <button onClick={() => setShowCargo(!showCargo)}
                    className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium ${showCargo ? 'bg-amber-100 text-amber-700' : 'bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 text-amber-600 dark:text-amber-400'} hover:shadow`}>
                    <Truck size={13} /> Revize
                  </button>
                )}
                <button onClick={handleCancel}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 rounded-lg text-xs text-amber-600 dark:text-amber-400 hover:shadow font-medium">
                  <AlertTriangle size={13} /> Sip.İptal
                </button>
                <button onClick={handleDelete}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400 hover:shadow font-medium">
                  <Trash2 size={13} /> Sil
                </button>
                <button onClick={() => window.open(`https://wa.me/${selected.customer_phone}`, '_blank')}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 hover:shadow font-medium">
                  <MessageCircle size={13} /> WA
                </button>
                <button onClick={() => window.open(`tel:${selected.customer_phone}`, '_blank')}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 rounded-lg text-xs text-blue-600 dark:text-blue-400 hover:shadow font-medium">
                  <PhoneCall size={13} /> Ara
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Drawer */}
      {showChat && selected && (
        <ChatHistoryDrawer orderId={selected.id} customerPhone={selected.customer_phone || ''} onClose={() => setShowChat(false)} />
      )}
    </div>
  );
}
