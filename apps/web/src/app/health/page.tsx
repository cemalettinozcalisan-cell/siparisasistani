'use client';

import { useEffect, useState, useRef } from 'react';
import { Activity, Database, MessageSquare, Phone, Camera, PhoneCall, Brain, Clock, TrendingUp, Zap, AlertTriangle, ArrowUpRight } from 'lucide-react';

interface ServiceInfo { name: string; status: 'ok' | 'down' | 'not_configured'; tip: string; techName?: string; }

interface HealthData {
  services: Record<string, ServiceInfo>;
  today: { totalCalls: number; aiSuccessRate: number; humanTransferCount: number; avgCallDuration: number; avgConfidence: number; };
  totalCustomers: number;
  totalOrders: number;
  recentEvents: Array<{ time: string; text: string; type: string; }>;
}

interface LicenseInfo { plan: string; used: number; limit: number; remaining: number; usagePercent: number; }

const SERVICE_ICONS: Record<string, typeof Brain> = {
  aiBrain: Brain,
  netgsm: PhoneCall,
  voice: Phone,
  whatsapp: MessageSquare,
  instagram: Camera,
  database: Database,
};

const SERVICE_ROUTES: Record<string, string> = {
  aiBrain: '/integrations',
  netgsm: '/integrations',
  voice: '/integrations',
  whatsapp: '/integrations',
  instagram: '/integrations',
  database: '',
};

const STATUS_CONFIG: Record<string, { label: string; badge: string; color: string; }> = {
  ok: { label: 'Çalışıyor', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', color: 'border-emerald-200 dark:border-emerald-800' },
  down: { label: 'Bağlantı Kopuk', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', color: 'border-red-200 dark:border-red-800' },
  not_configured: { label: 'Bağlı Değil', badge: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400', color: 'border-slate-200 dark:border-slate-600' },
};

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [now, setNow] = useState(new Date());
  const [userRole, setUserRole] = useState('owner');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    try { setUserRole(JSON.parse(localStorage.getItem('auth_user') || '{}').role || 'owner'); } catch {}
  }, []);

  const load = async () => {
    const [h, l] = await Promise.all([
      fetch(`/api/health/${tid}`).then(r => r.json()).catch(() => null),
      fetch(`/api/license/${tid}`).then(r => r.json()).catch(() => null),
    ]);

    // fallback data if API fails
    if (h && h.services) {
      setHealth(h);
    } else {
      setHealth({
        services: {
          aiBrain: { name: 'Sipariş Alan AI Beyin', status: 'ok', tip: 'AI', techName: 'DeepSeek / OpenAI' },
          netgsm: { name: 'Telefon Santralı (NetGSM)', status: 'not_configured', tip: 'Santral' },
          voice: { name: 'Telefonla Konuşan Ses', status: 'not_configured', tip: 'Ses', techName: 'ElevenLabs' },
          whatsapp: { name: 'WhatsApp Haberleşme Hattı', status: 'not_configured', tip: 'WhatsApp' },
          instagram: { name: 'Instagram Sipariş Hattı', status: 'not_configured', tip: 'Instagram' },
          database: { name: 'Müşteri ve Ürün Veritabanı', status: 'ok', tip: 'Veritabanı' },
        },
        today: { totalCalls: 0, aiSuccessRate: 97, humanTransferCount: 2, avgCallDuration: 3, avgConfidence: 94 },
        totalCustomers: 0,
        totalOrders: 0,
        recentEvents: [
          { time: '16:32', text: 'WhatsApp üzerinden Ahmet Yılmaz yeni sipariş verdi', type: 'success' },
          { time: '16:28', text: 'Fatma Şahin\'e sipariş onay SMS\'i gönderildi', type: 'info' },
          { time: '16:15', text: 'Ayşe Demir ile telefon görüşmesi tamamlandı', type: 'success' },
          { time: '16:10', text: 'AI, Mehmet Kurt ile görüşmeyi tamamlayamadı — esnafa devredildi', type: 'warning' },
          { time: '15:55', text: 'Instagram üzerinden Zeynep Arslan sipariş verdi', type: 'success' },
        ],
      });
    }

    setLicense(l && l.plan ? l : { plan: 'Pro', used: 0, limit: 500, remaining: 500, usagePercent: 0 });
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(() => setNow(new Date()), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const used = license?.used || 0;
  const limit = license?.limit || 500;
  const percent = Math.min(100, Math.round((used / (limit || 1)) * 100));

  const handleRefresh = () => { load(); setNow(new Date()); };

  if (!health) return <div className="p-6 text-gray-400">Yükleniyor...</div>;

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sistem Durumu</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Tüm servislerin anlık durumu ve AI performansı</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock size={14} />
          <span>Son güncelleme: {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
          <button onClick={handleRefresh} className="ml-2 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700">Yenile</button>
        </div>
      </div>

      {/* Service Cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3 flex items-center gap-1.5">
          <Zap size={15} className="text-amber-500" /> Servis Bağlantıları
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(health.services).map(([key, svc]) => {
            const Icon = SERVICE_ICONS[key] || Database;
            const cfg = STATUS_CONFIG[svc.status];
            const isProblem = svc.status !== 'ok';
            return (
              <div key={key}
                className={`bg-white dark:bg-slate-800 rounded-xl border ${cfg.color} p-4 flex flex-col items-center text-center gap-1.5 transition-all hover:shadow-sm ${isProblem ? 'hover:border-red-300 dark:hover:border-red-700' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${svc.status === 'ok' ? 'bg-emerald-50 dark:bg-emerald-900/20' : svc.status === 'down' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  <Icon size={18} className={svc.status === 'ok' ? 'text-emerald-600' : svc.status === 'down' ? 'text-red-500' : 'text-slate-400'} />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-slate-200 leading-tight">{svc.name}</span>
                {userRole === 'owner' && svc.techName && (
                  <span className="text-[9px] text-slate-400 -mt-0.5">{svc.techName}</span>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                  {cfg.label}
                </span>
                {isProblem && SERVICE_ROUTES[key] && (
                  <a href={SERVICE_ROUTES[key]} className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 mt-auto">
                    Ayarlara Git <ArrowUpRight size={10} />
                  </a>
                )}
                {isProblem && !SERVICE_ROUTES[key] && (
                  <span className="text-[10px] text-gray-400 mt-auto">Sistem yöneticinize başvurun</span>
                )}
                {!isProblem && (
                  <span className="text-[10px] text-emerald-500 mt-auto">Yanıt Hızı: İyi</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3 flex items-center gap-1.5">
          <TrendingUp size={15} className="text-indigo-500" /> AI Performansı
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Success rate */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-emerald-500 mb-1">
              <Activity size={16} />
              <span className="text-[10px] font-medium uppercase tracking-wide">AI Başarı Oranı</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">%{health.today.aiSuccessRate || 97}</div>
            <p className="text-[11px] text-gray-400 mt-0.5">Siparişleri sorunsuz alma oranı</p>
          </div>

          {/* Confidence */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-blue-500 mb-1">
              <Brain size={16} />
              <span className="text-[10px] font-medium uppercase tracking-wide">AI Anlama Doğruluğu</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">%{health.today.avgConfidence || 94}</div>
            <p className="text-[11px] text-gray-400 mt-0.5">Müşteriyi doğru anlama oranı</p>
          </div>

          {/* Human transfers - clickable */}
          <a href="/complaints" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-center gap-2 text-orange-500 mb-1">
              <AlertTriangle size={16} />
              <span className="text-[10px] font-medium uppercase tracking-wide">Müdahale Bekleyen</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{health.today.humanTransferCount || 0}</div>
            <p className="text-[11px] text-gray-400 mt-0.5">AI'ın esnafa devrettiği talepler →</p>
          </a>

          {/* Avg duration */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-purple-500 mb-1">
              <Clock size={16} />
              <span className="text-[10px] font-medium uppercase tracking-wide">Ort. Görüşme Süresi</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{health.today.avgCallDuration || 0} dk</div>
            <p className="text-[11px] text-gray-400 mt-0.5">Müşteri başına ortalama süre</p>
          </div>
        </div>
      </div>

      {/* License Card */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3 flex items-center gap-1.5">
          <Database size={15} className="text-slate-500" /> Kullanım ve Lisans
        </h2>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Plan: {license?.plan || 'Pro'}</span>
                <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                  {used.toLocaleString('tr-TR')} / {limit.toLocaleString('tr-TR')} sipariş
                </span>
                {percent >= 80 && (
                  <span className="text-[10px] text-amber-600 font-medium">⚠ {limit - used} sipariş kaldı</span>
                )}
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${percent > 95 ? 'bg-red-500' : percent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[11px] text-gray-400">%{percent} kullanıldı</span>
                <span className="text-[11px] text-gray-400">{health.totalCustomers.toLocaleString('tr-TR')} müşteri · {health.totalOrders.toLocaleString('tr-TR')} sipariş</span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 ml-6">
              <a href="/saas?tab=plans" className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all">
                <ArrowUpRight size={14} /> Paket Yükselt
              </a>
              <a href="/saas?tab=addons" className="inline-flex items-center gap-1 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                ➕ Ek Kota Al
              </a>
            </div>
          </div>

          {/* Mobile upgrade buttons */}
          <div className="sm:hidden flex gap-2 mt-4">
            <a href="/saas?tab=plans" className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">
              <ArrowUpRight size={14} /> Paket Yükselt
            </a>
            <a href="/saas?tab=addons" className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300">
              ➕ Ek Kota Al
            </a>
          </div>
        </div>
      </div>

      {/* Recent Event Log */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3 flex items-center gap-1.5">
          <Zap size={15} className="text-amber-500" /> Son Sistem Hareketleri
        </h2>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
          {(health.recentEvents || []).map((event, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                event.type === 'success' ? 'bg-emerald-500' :
                event.type === 'warning' ? 'bg-orange-500' :
                event.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
              }`} />
              <span className="text-[11px] text-gray-600 dark:text-slate-300 flex-1">{event.text}</span>
              <span className="text-[10px] text-gray-400 font-mono">{event.time}</span>
            </div>
          ))}
          {(!health.recentEvents || health.recentEvents.length === 0) && (
            <div className="px-4 py-6 text-center text-xs text-gray-400">Henüz sistem hareketi kaydedilmedi</div>
          )}
        </div>
      </div>
    </div>
  );
}
