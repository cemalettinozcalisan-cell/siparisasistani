'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, PhoneCall, ShoppingBag, ShoppingCart, Users, User, UserCheck, HelpCircle, CreditCard, Wallet, Target, ArrowRight, CheckCircle2, Sparkles, BellRing, ChevronDown, Truck, Send, MessageSquare, BarChart3, LineChart, FileText, Megaphone, HandCoins, Instagram, Globe, Printer, TrendingUp, AlertCircle, Phone, Clock, Store, Flame, Gift, ChefHat, Layers, Zap, ShieldCheck, X, Sun, Moon } from 'lucide-react';
import { WhatsAppIcon } from '@/components/channel-icons';

const OMNICHANNEL_FLOW = [
  { icon: PhoneCall, label: 'Telefon', desc: 'Sesli arama', color: 'from-blue-500 to-blue-600' },
  { icon: WhatsAppIcon, label: 'WhatsApp', desc: 'Mesajlaşma', color: 'from-emerald-500 to-emerald-600' },
  { icon: Instagram, label: 'Instagram', desc: 'DM mesajı', color: 'from-pink-500 to-pink-600' },
  { icon: MessageSquare, label: 'SMS', desc: 'Kısa mesaj', color: 'from-orange-400 to-orange-600' },
  { icon: Globe, label: 'Web Sitesi', desc: 'Online sipariş', color: 'from-sky-500 to-sky-600' },
  { icon: Bot, label: 'AI Asistan', desc: 'Siparişi alır', color: 'from-violet-500 to-violet-600' },
  { icon: BarChart3, label: 'CRM', desc: 'Kayıt düşer', color: 'from-rose-500 to-rose-600' },
  { icon: WhatsAppIcon, label: 'WhatsApp', desc: 'Gruba iletir', color: 'from-emerald-500 to-emerald-600' },
  { icon: Printer, label: 'Yazıcı', desc: 'Fiş çıkar', color: 'from-amber-500 to-amber-600' },
  { icon: Truck, label: 'Kargo', desc: 'Kargo kodu iletilir', color: 'from-cyan-500 to-cyan-600' },
  { icon: ShoppingBag, label: 'Raporlar', desc: 'Analiz', color: 'from-indigo-500 to-indigo-600' },
];

// Hero mockup — dashboard AI şeması kanalları (bağlantı çizgisi rengiyle)
const MOCK_HUB_LEFT = [
  { name: 'Telefon', sub: 'Arama alınıyor', icon: Phone, iconBg: 'bg-blue-500', cardBorder: 'border-blue-500/40', lineStroke: '#3b82f6' },
  { name: 'WhatsApp', sub: 'Mesaj alınıyor', icon: WhatsAppIcon, iconBg: 'bg-emerald-500', cardBorder: 'border-emerald-500/40', lineStroke: '#10b981' },
  { name: 'Instagram', sub: 'DM alınıyor', icon: Instagram, iconBg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600', cardBorder: 'border-pink-500/40', lineStroke: '#d946ef' },
];

const MOCK_HUB_RIGHT = [
  { name: 'SMS', sub: 'Mesaj alınıyor', icon: MessageSquare, iconBg: 'bg-orange-500', cardBorder: 'border-orange-500/40', lineStroke: '#f59e0b' },
  { name: 'Web Siteniz', sub: 'Sipariş alınıyor', icon: Globe, iconBg: 'bg-cyan-500', cardBorder: 'border-cyan-500/40', lineStroke: '#06b6d4' },
];

const MOCK_HUB_FEATURES = [
  { icon: ShoppingBag, text: 'Siparişleri alır', gradient: 'from-blue-500 to-cyan-600' },
  { icon: UserCheck, text: 'Müşterileri tanır', gradient: 'from-emerald-500 to-green-600' },
  { icon: LineChart, text: 'Müşteri Analizi yapar', gradient: 'from-violet-500 to-purple-600' },
  { icon: HelpCircle, text: 'Soruları yanıtlar', gradient: 'from-sky-500 to-blue-600' },
  { icon: CreditCard, text: 'Ödemeyi yönetir', gradient: 'from-amber-500 to-orange-600' },
  { icon: Truck, text: 'Kargoyu takip eder', gradient: 'from-cyan-500 to-teal-600' },
  { icon: FileText, text: 'Raporlar', gradient: 'from-indigo-500 to-blue-600' },
  { icon: Megaphone, text: 'Kampanyaları Yönetir', gradient: 'from-fuchsia-500 to-pink-600' },
  { icon: HandCoins, text: 'Satış Yapar', gradient: 'from-emerald-500 to-green-600' },
  { icon: TrendingUp, text: 'İşletmenizi büyütür', gradient: 'from-pink-500 to-rose-600' },
];

const MOCK_KPIS = [
  { label: 'Bugünkü Sipariş', value: '42', icon: ShoppingCart, gradient: 'from-blue-500 to-cyan-600', border: 'border-blue-500/40', trend: '↑ %19' },
  { label: 'Kargo Takibi', value: '14', icon: Truck, gradient: 'from-amber-500 to-orange-600', border: 'border-amber-500/40', trend: '↑ %12' },
  { label: 'Talep & İstek', value: '6', icon: AlertCircle, gradient: 'from-pink-500 to-rose-600', border: 'border-pink-500/40', trend: '↑ %14' },
  { label: 'Bugünkü Ciro', value: '28.450 TL', icon: Wallet, gradient: 'from-emerald-500 to-green-600', border: 'border-emerald-500/40', trend: '↑ %22' },
  { label: 'AI Müşteri', value: '118', icon: User, gradient: 'from-purple-500 to-violet-600', border: 'border-purple-500/40', trend: '↑ %33' },
  { label: 'AI Satış', value: '8.450 TL', icon: TrendingUp, gradient: 'from-indigo-500 to-blue-600', border: 'border-blue-500/40', trend: '↑ %28' },
  { label: 'AI Başarı', value: '%97', icon: Target, gradient: 'from-teal-500 to-emerald-600', border: 'border-emerald-500/40', trend: '↑ %4' },
];

const FAQ = [
  { q: 'SiparişAsistanı nedir?', a: 'SiparişAsistanı, gıda ve yöresel ürün üreticileri için geliştirilmiş yapay zekâ destekli bütünleşik bir sipariş, satış ve işletme yönetim platformudur. Telefon aramaları, WhatsApp mesajları, Instagram DM, SMS ve Web Siteniz üzerinden gelen tüm sipariş taleplerini yapay zekâ asistanı ile 7/24 otomatik olarak karşılar; sipariş detaylarını anında CRM panelinize işler. Müşterilerinize bilgilendirme ve kargo takip mesajlarını otomatik olarak iletir. Size sadece siparişleri paketleyip göndermek kalır.' },
  { q: 'SiparişAsistanı nasıl çalışır?', a: 'Telefon, WhatsApp, Instagram, SMS ve Web sitenizden gelen tüm müşteri çağrılarını ve mesajlarını yapay zekâ ajanlarımız karşılar. Müşterinizin talebini anlayıp siparişi alır; adres ve sipariş detaylarını doğrulayarak yönetim panelinize, WhatsApp grubunuza ve fiş yazıcınıza anında iletir. Size sadece siparişi paketleyip göndermek kalır.' },
  { q: 'Sistemi kurmak ne kadar sürer? Teknik bilgiye ihtiyacım var mı?', a: 'Hiçbir teknik bilgiye veya yazılımcıya ihtiyacınız yoktur. Ekibimiz tüm entegrasyon süreçlerini sizin adınıza tamamlar ve sisteminizi aynı gün içinde (veya 24 saat içinde) kullanıma hazır hale getirir.' },
  { q: 'SiparişAsistanı hangi sektörler için uygundur?', a: 'SiparişAsistanı; başta sucuk, lokum, şarküteri, bükme, yumurta ve yerel lezzet üreticileri olmak üzere, tüm yöresel gıda üreticileri ve işletmeler için özel olarak tasarlanmıştır. Telefon ve sosyal medya üzerinden yoğun sipariş trafiği yöneten her ölçekteki üretici için %100 uyumludur.' },
  { q: 'Kargo takibi nasıl çalışır?', a: 'Siparişiniz kargoya verildiğinde, aldığınız takip kodunu panele girmeniz yeterlidir. Yapay zekâ asistanınız; kargo firması, takip numarası ve sorgulama bağlantısını içeren kişiselleştirilmiş bilgilendirme mesajını müşterinize anında ve otomatik olarak iletir.' },
  { q: 'Telefon hattıma bağlanabiliyor mu?', a: 'Evet. Mevcut sabit veya kurumsal telefon hattınızla %100 uyumlu şekilde çalışır. Yeni bir hat satın almanıza veya numaranızı değiştirmenize gerek kalmadan, mevcut numaranızı yapay zekâ asistanımıza saniyeler içinde entegre edebilirsiniz.' },
  { q: 'WhatsApp, Instagram, SMS ve Web sitenizden gelen siparişleri görebilir miyim?', a: 'Evet. Sistemimiz WhatsApp Business API, Instagram DM, SMS ve Web Sitenizin altyapılarıyla %100 entegre çalışır. Mesajları 7/24 yanıtlar, siparişleri otomatik alır ve kargo takibini müşterilerinize iletir.' },
  { q: 'Müşteri ve sipariş verilerimiz güvende mi?', a: 'Evet, %100 güvendedir. Platformumuz tam izole veri mimarisiyle çalışır. İşletmenize ve müşterilerinize ait tüm veriler yüksek güvenlikli sunucularda, uçtan uca şifrelenerek saklanır. Verilerinize sizden başka hiçbir işletme veya üçüncü taraf kesinlikle erişemez.' },
  { q: 'Yapay zekânın aldığı siparişlere müdahale edebilir miyim?', a: 'Dilediğiniz zaman. Yönetim paneliniz üzerinden tüm canlı görüşmeleri ve mesajlaşmaları anlık görebilir, gerektiğinde yapay zekâyı devreden çıkarıp konuşmaya veya sipariş detayına tek tıkla müdahale edebilirsiniz.' },
  { q: 'Mesai saatleri dışında veya hafta sonu sistem çalışmaya devam eder mi?', a: 'Evet, 7 gün 24 saat kesintisiz çalışır. İşletmeniz kapalı olsa bile yapay zekâ asistanınız gelen tüm aramaları ve mesajları yanıtlar, siparişleri toplar ve ertesi güne hazır hale getirir.' },
  { q: 'Kullandığım muhasebe veya stok programına entegre oluyor mu?', a: 'Evet. SiparişAsistanı, kullandığınız mevcut muhasebe, stok ve ERP sistemleriyle (Logo, Luca, Mikro, Akınsoft, Nebim vb.) tam uyumlu çalışarak siparişleri doğrudan sisteminize aktarabilir.' },
];

const NAV_LINKS = [
  { label: 'Neden Sipariş Asistanı', href: '#basari-hikayeleri' },
  { label: 'CRM', href: '#crm' },
  { label: 'Entegrasyonlar', href: '#entegrasyonlar' },
  { label: 'Sipariş Asistanı Nasıl Çalışır', href: '#nasil-calisir' },
  { label: 'SSS', href: '#sss' },
];

const REFERENCES = [
  'Zafer Sucukları', 'Öztürk Lokum', 'Kaya Bükmeleri',
  'Yıldız Sucuk', 'Çelik Lokumları', 'Şahin Et Ürünleri',
  'Ayyıldız Gıda', 'Doğal Lezzetler',
];

const LEGAL_TEXTS = {
  aydinlatma: `SiparişAsistanı Yazılım A.Ş. ("Şirket") olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla hareket etmekteyiz.

İşlenen Kişisel Veriler: Ad soyad, telefon numarası, e-posta adresi, şirket bilgileri, müşteri sipariş geçmişi ve tercihleri.

Amaç: Platform hizmetlerinin sunulması, sipariş yönetimi, müşteri ilişkileri, yasal yükümlülüklerin yerine getirilmesi.

Saklama Süresi: İşlenme amacının gerektirdiği süre boyunca saklanır.

Haklarınız: KVKK Madde 11 kapsamında verilerinize erişme, düzeltme, silme ve işlemenin durdurulmasını talep etme hakkına sahipsiniz.

Başvuru: asistan@siparisasistani.com adresinden taleplerinizi iletebilirsiniz.`,

  gizlilik: `SiparişAsistanı olarak müşterilerimizin gizliliğine büyük önem veriyoruz.

Veri Güvenliği: Tüm veriler uçtan uca şifreleme ile korunur. Verileriniz KVKK AI altyapısı tarafından denetlenir.

Üçüncü Taraflarla Paylaşım: Verileriniz, yasal zorunluluklar haricinde hiçbir üçüncü tarafla paylaşılmaz.

Çalışan Erişimi: Verilere yalnızca yetkili personel erişebilir. Tüm erişimler audit log ile kayıt altına alınır.

Veri İhlali: Olası bir veri ihlali durumunda 72 saat içinde KVKK'ya bildirim yapılır ve etkilenen kullanıcılar bilgilendirilir.`,

  cerez: `SiparişAsistanı olarak web sitemizde çerez (cookie) kullanmaktayız.

Zorunlu Çerezler: Platformun çalışması için gereklidir. Oturum yönetimi, güvenlik ve KVKK uyumluluğu için kullanılır. Devre dışı bırakılamaz.

Performans Çerezleri: Sayfa kullanım istatistikleri ve performans ölçümleri için kullanılır. İsteğe bağlıdır, tercihlerinize göre yönetebilirsiniz.

Çerezleri Nasıl Yönetirim? Tarayıcı ayarlarınızdan çerezleri silebilir veya "Çerez Tercihleri" butonundan performans çerezlerini kapatabilirsiniz.

KVKK Uyumu: Çerez altyapımız KVKK AI standartları ile uçtan uca denetlenmektedir.`,

  kullanim: `SiparişAsistanı platformunu kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız.

Hizmet Kapsamı: Platform, AI destekli sipariş yönetimi, müşteri ilişkileri ve işletme yönetimi hizmetleri sunar.

Kullanıcı Yükümlülükleri: Platforma doğru ve güncel bilgiler sağlamak, başkalarının hesaplarına erişmeye çalışmamak, platformu yasa dışı amaçlarla kullanmamak.

Fikri Mülkiyet: Platformun tüm içeriği, tasarımı ve yazılımı SiparişAsistanı Yazılım A.Ş.'ye aittir. İzinsiz kopyalanamaz veya dağıtılamaz.

Hizmet Kesintisi: Mücbir sebepler dışında %99 uptime taahhüt edilir. Planlı bakımlar önceden bildirilir.

Sorumluluk Sınırı: Platform üzerinden alınan siparişlerin içeriğinden kullanıcı sorumludur. Şirket, dolaylı zararlardan sorumlu tutulamaz.`,

  hizmet: `İşbu Hizmet Sözleşmesi, SiparişAsistanı Yazılım A.Ş. ("Hizmet Sağlayıcı") ile platformu kullanan gerçek/tüzel kişi ("Abone") arasında akdedilmiştir.

Madde 1 — Konu: Bu sözleşme, Abone'nin SiparişAsistanı platformunu kullanım koşullarını belirler.

Madde 2 — Süre: Sözleşme, Abone'nin dijital onayı ile yürürlüğe girer ve seçilen paket süresince geçerlidir.

Madde 3 — Paket ve Kota: Abone, fatura dönemi içinde paketini değiştirebilir. Kullanılmayan sipariş hakkı sonraki aya devretmez.

Madde 4 — Ödeme: Faturalar aylık düzenlenir. Ödeme kredi kartı veya havale/EFT ile yapılır. Vadesinde ödenmeyen fatura için 7 gün ek süre tanınır.

Madde 5 — Cayma Hakkı: Abone ilk 14 gün içinde gerekçesiz cayma hakkına sahiptir.

Madde 6 — KVKK ve Gizlilik: Abone verileri KVKK kapsamında işlenir, üçüncü taraflarla paylaşılmaz.

Madde 7 — Hizmet Seviyesi: %99 uptime taahhüt edilir. Planlı bakımlar önceden bildirilir.

Madde 8 — Yürürlük: Dijital onay ile yürürlüğe girer.`,
};

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [demoForm, setDemoForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [demoSent, setDemoSent] = useState(false);
  const [sending, setSending] = useState(false);

  const [cookieAccepted, setCookieAccepted] = useState(false);
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTitle, setLegalTitle] = useState('');
  const [legalBody, setLegalBody] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [contactSent, setContactSent] = useState(false);
  const [contactSending, setContactSending] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Hero mockup — AI şeması bağlantı çizgileri için ölçüm
  const gridRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const leftCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rightCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [hubLines, setHubLines] = useState<{ x0: number; y0: number; x1: number; y1: number; color: string }[]>([]);
  const [gridSize, setGridSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => {
      const grid = gridRef.current;
      const coreEl = coreRef.current;
      if (!grid || !coreEl) return;
      const gr = grid.getBoundingClientRect();
      const cr = coreEl.getBoundingClientRect();
      const cx = cr.left + cr.width / 2 - gr.left;
      const cy = cr.top + cr.height / 2 - gr.top;
      const radius = cr.width / 2 + 20;
      const next: { x0: number; y0: number; x1: number; y1: number; color: string }[] = [];
      const connect = (el: HTMLDivElement | null, edgeFromLeft: boolean, color: string) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x0 = (edgeFromLeft ? r.right : r.left) - gr.left;
        const y0 = r.top + r.height / 2 - gr.top;
        const dx = cx - x0;
        const dy = cy - y0;
        const dist = Math.hypot(dx, dy) || 1;
        next.push({ x0, y0, x1: cx - (dx / dist) * radius, y1: cy - (dy / dist) * radius, color });
      };
      MOCK_HUB_LEFT.forEach((ch, i) => connect(leftCardRefs.current[i], true, ch.lineStroke));
      MOCK_HUB_RIGHT.forEach((ch, i) => connect(rightCardRefs.current[i], false, ch.lineStroke));
      setHubLines(next);
      setGridSize({ w: gr.width, h: gr.height });
    };
    const t = setTimeout(update, 100);
    update();
    window.addEventListener('resize', update);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && gridRef.current) {
      ro = new ResizeObserver(update);
      ro.observe(gridRef.current);
    }
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setActiveStep((prev) => (prev + 1) % OMNICHANNEL_FLOW.length), 2500);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => { try { setCookieAccepted(localStorage.getItem('cookie_accepted') === 'true'); } catch {} }, []);
  useEffect(() => { try { const saved = localStorage.getItem('theme') as 'light' | 'dark' | null; if (saved === 'dark') { setTheme('dark'); document.documentElement.classList.add('dark'); } } catch {} }, []);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: demoForm.company, ownerName: demoForm.name, ownerEmail: demoForm.email, phone: demoForm.phone }),
      });
    } catch (e) { console.error(e); }
    setDemoSent(true);
    setSending(false);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSending(true);
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contactForm) });
      if (res.ok) setContactSent(true);
    } catch (e) { console.error(e); }
    setContactSending(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo2.png" alt="SiparişAsistanı" className="w-8 h-8 object-contain" />
            <span className="text-sm"><span className="font-bold text-slate-900 dark:text-white">Sipariş</span><span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Asistanı</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((item) => (
              <a key={item.label} href={item.href}
                className="text-sm font-medium text-slate-600 dark:text-slate-300 dark:text-slate-400 dark:text-slate-500 hover:text-indigo-600 transition-colors">{item.label}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); document.documentElement.classList.toggle('dark', next === 'dark'); try { localStorage.setItem('theme', next); } catch {} }}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:bg-slate-800 transition-all">
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <a href="/login" className="text-sm font-semibold text-slate-700 dark:text-slate-200 dark:text-slate-300 hover:text-indigo-600 transition-colors">Giriş</a>
            <a href="#demo" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 shadow-md shadow-indigo-200 text-white font-medium rounded-xl px-4 py-2 text-xs transition-all">Ücretsiz Dene</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section id="anasayfa" className="max-w-[88rem] mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 rounded-full text-xs font-medium text-violet-700 mb-6 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" /> AI Destekli Sipariş Sistemi
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight">
          Telefon, WhatsApp, Instagram,
          <br />
          SMS ve Web sitenizden gelen siparişleri
          <br />
          <span className="animate-gradient-text">tek panelden yönetin</span>
        </h1>
        <p className="mt-4 text-lg max-w-2xl mx-auto leading-relaxed font-semibold">
          <span className="animate-gradient-text">Yapay Zekâ Siparişlerinizi Yönetsin,</span>
          <span className="text-slate-900 dark:text-white"> Siz Satışlarınızı Büyütün.</span>
        </p>
        <p className="mt-3 text-sm text-violet-600 font-medium bg-violet-50 inline-block px-4 py-1 rounded-full">SiparişAsistanı Ai — Yapay Zeka Ticari İşletim Sistemi</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a href="#demo" className="btn-primary group"><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /> Ücretsiz Dene</a>
          <a href="#demo" className="btn-secondary">Hemen Bilgi Al</a>
        </div>

        {/* AI Scheme + Yetenek Paneli + KPI — ferah, şeffaf yapı */}
        <div className="mt-20 relative max-w-5xl mx-auto drop-shadow-[0_10px_35px_rgba(99,102,241,0.15)]">
          <div className="relative">
            {/* Orkestrasyon — AI çipi + kanallar + yetenek paneli (ölçüme dayalı neon bağlantı hatlarıyla) */}
            <div ref={gridRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative">
              {/* Neon SVG bağlantı hatları */}
              <svg className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none" width={gridSize.w} height={gridSize.h} viewBox={`0 0 ${gridSize.w} ${gridSize.h}`} fill="none">
                {hubLines.map((l, i) => (
                  <g key={i}>
                    <path d={`M ${l.x0} ${l.y0} C ${(l.x0 + l.x1) / 2} ${l.y0}, ${(l.x0 + l.x1) / 2} ${l.y1}, ${l.x1} ${l.y1}`} stroke={l.color} strokeWidth="2" className="opacity-60" style={{ filter: `drop-shadow(0 0 5px ${l.color})` }} />
                    <circle cx={l.x0} cy={l.y0} r="4" fill={l.color} stroke="#0f172a" strokeWidth="1.5" />
                    <circle cx={l.x1} cy={l.y1} r="4" fill={l.color} className="animate-pulse" />
                  </g>
                ))}
              </svg>

              {/* Sol kanallar */}
              <div className="lg:col-span-3 flex flex-row lg:flex-col gap-3.5 flex-wrap justify-center lg:justify-start lg:items-end z-10">
                {MOCK_HUB_LEFT.map((ch, i) => {
                  const ChIcon = ch.icon;
                  return (
                    <div key={ch.name} ref={(el) => { leftCardRefs.current[i] = el; }} className={`relative flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-indigo-950/40 border ${ch.cardBorder} shadow-[0_0_15px_rgba(99,102,241,0.1)] w-56 max-w-[14rem]`}>
                      <div className={`w-10 h-10 rounded-lg ${ch.iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
                        <ChIcon size={20} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{ch.name}</p>
                        <p className="text-[10px] text-slate-400">{ch.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Merkez AI Çekirdek */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center gap-4 z-10 py-4">
                <div className="relative">
                  <div className="absolute inset-[-28px] rounded-full border border-fuchsia-400/10" />
                  <div className="absolute inset-[-14px] rounded-full border border-fuchsia-400/20" />
                  <div ref={coreRef} className="relative w-36 h-36 md:w-44 md:h-44 rounded-full bg-[#0C1027] border border-indigo-500/40 shadow-[0_0_40px_rgba(168,85,247,0.35)] flex items-center justify-center">
                    <div className="absolute inset-[-8px] rounded-full border-2 border-fuchsia-500/40 animate-ping [animation-duration:3s]" />
                    <img src="/logo2.png" alt="AI Çekirdek" className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-[0_0_20px_rgba(99,102,241,0.85)]" />
                  </div>
                </div>
                <div className="rounded-full bg-[#0C1027]/80 border border-indigo-400/60 shadow-[0_0_20px_rgba(99,102,241,0.3)] px-6 py-2 flex items-baseline gap-2">
                  <span className="text-sm font-bold text-cyan-400 tracking-wide">AI Aktif</span>
                  <span className="text-lg font-extrabold text-indigo-400 tabular-nums">%97</span>
                </div>
              </div>

              {/* Sağ kanallar */}
              <div className="lg:col-span-2 flex flex-row sm:flex-col gap-3.5 flex-wrap justify-center sm:justify-start z-10">
                {MOCK_HUB_RIGHT.map((ch, i) => {
                  const ChIcon = ch.icon;
                  return (
                    <div key={ch.name} ref={(el) => { rightCardRefs.current[i] = el; }} className={`relative flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-indigo-950/40 border ${ch.cardBorder} shadow-[0_0_15px_rgba(99,102,241,0.1)] w-56 sm:w-full max-w-[14rem]`}>
                      <div className={`w-10 h-10 rounded-lg ${ch.iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
                        <ChIcon size={20} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{ch.name}</p>
                        <p className="text-[10px] text-slate-400">{ch.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Yetenek Paneli (Right Panel) — şık, şeffaf, kompakt */}
              <div className="lg:col-span-3 flex justify-center lg:justify-end items-stretch z-10">
                <div className="rounded-xl bg-slate-900/50 backdrop-blur-md p-4 w-full max-w-[16rem] h-full flex flex-col justify-center gap-2 border border-white/5">
                  {MOCK_HUB_FEATURES.map((f, i) => {
                    const FIcon = f.icon;
                    return (
                      <div key={i} className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-300">
                        <span className={`w-7 h-7 rounded-lg bg-gradient-to-br ${f.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                          <FIcon size={14} className="text-white" />
                        </span>
                        {f.text}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 7 KPI — tek sıra (dikey nefes payı ile) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mt-10">
              {MOCK_KPIS.map((k, i) => {
                const KIcon = k.icon;
                return (
                  <div key={i} className={`group bg-slate-900/60 backdrop-blur-sm border ${k.border} rounded-2xl p-3.5 shadow-2xl`}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${k.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                        <KIcon size={18} className="text-white" />
                      </span>
                      <span className="text-xs font-bold text-slate-200 leading-tight">{k.label}</span>
                    </div>
                    <div className="text-lg font-extrabold text-white text-center mb-2 tabular-nums">{k.value}</div>
                    <div className="flex items-center justify-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{k.trend}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Omnichannel Flow */}
      <section className="bg-white dark:bg-slate-900 py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center">
            Tüm satış kanallarınızı <span className="animate-gradient-text">tek bir platformda</span> birleştirin
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {OMNICHANNEL_FLOW.slice(0, 5).map((step, i) => {
              const Icon = step.icon;
              const isActive = i === activeStep;
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg transition-all duration-500 ${isActive ? 'scale-110 shadow-xl ring-4 ring-white/30' : ''}`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-2">{step.label}</p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Nasıl Çalışır */}
      <section id="nasil-calisir" className="bg-slate-50 dark:bg-slate-800/70 border-y border-slate-100 dark:border-slate-700 py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center">Sipariş <span className="animate-gradient-text">Asistanı </span>Nasıl Çalışır?</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {OMNICHANNEL_FLOW.slice(5, 11).map((step, i) => {
              const Icon = step.icon;
              const isActive = (i + 5) === activeStep;
              return (
                <div key={i + 5} className="flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg transition-all duration-500 ${isActive ? 'scale-110 shadow-xl ring-4 ring-white/30' : ''}`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-2">{step.label}</p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">{step.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            {OMNICHANNEL_FLOW.map((_, i) => (
              <button key={i} onClick={() => setActiveStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === activeStep ? 'bg-violet-500 w-4' : 'bg-slate-300'}`} />
            ))}
          </div>
        </div>
      </section>

      {/* Sektör Kartları */}
      <section className="bg-white dark:bg-slate-900 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 dark:text-white mb-2">Geleceğin Ticaretine Güvenen İşletmeler</h2>
          <p className="text-center text-sm animate-gradient-text font-semibold mb-1">Geleneksel lezzetleri, yapay zekâ asistanı ile geleceğe taşıyanlar.</p>
          <p className="text-center text-sm font-semibold text-slate-700 dark:text-slate-200 dark:text-slate-300 mt-1 mb-8">İster toptan, ister perakende; SiparişAsistanı iş modelinize anında uyum sağlar.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Store, title: 'Toptan & Perakende', desc: 'Tüm toptan, perakende ve hizmet işletmeleri için müşteri mesajlarını siparişe dönüştürür.', color: 'from-blue-600 to-indigo-600 shadow-blue-200' },
              { icon: Globe, title: 'Yöresel Ürün & E-Ticaret', desc: 'Gastronomi Şehri Afyonkarahisar\'ın lezzetlerini tüm Türkiye\'ye gönderen işletmeler için siparişleri tek panele toplar.', color: 'from-emerald-500 to-teal-600 shadow-emerald-200' },
              { icon: Flame, title: 'Sucuk Üreticileri', desc: 'Farklı kilo, kangal ve vakumlu sucuk sipariş taleplerini yapay zekâ ile anında ve hatasız kaydeder.', color: 'from-red-500 to-rose-600 shadow-red-200' },
              { icon: Gift, title: 'Lokum & Şekerleme', desc: 'Özel kutu ve hediyelik lokum sipariş taleplerini anında algılar.', color: 'from-purple-500 to-pink-500 shadow-purple-200' },
              { icon: ChefHat, title: 'Bükme & Ağzıaçık Fırınları', desc: 'Günlük taze üretim bükme ve ağzıaçık siparişlerini eksiksiz ve tam vaktinde yönetir.', color: 'from-amber-500 to-orange-600 shadow-orange-200' },
              { icon: Layers, title: 'Yumurta Üreticileri', desc: 'Toptan ve koli bazlı siparişlerde cari müşteri taleplerini düzenler.', color: 'from-amber-400 to-yellow-500 shadow-amber-200' },
            ].map((card, i) => {
              const CardIcon = card.icon;
              return (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                <div className={`bg-gradient-to-br ${card.color} text-white p-3 rounded-xl shadow-md inline-flex items-center justify-center mb-3`}><CardIcon size={22} className="text-white" /></div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{card.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 leading-relaxed">{card.desc}</p>
              </div>
            )})}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="crm" className="bg-slate-50 dark:bg-slate-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white">Her Şey Tek Panelde</h2>
          <p className="mt-2 text-center text-sm animate-gradient-text font-semibold">Akıllı Sipariş. Hızlı Operasyon.</p>
          <div className="grid grid-cols-3 gap-6 mt-10">
            {[
              { icon: Bot, title: 'AI Sipariş Alma', desc: 'Telefon, WhatsApp, Instagram, SMS ve Web Siteniz üzerinden gelen siparişleri AI otomatik alır, siz sadece onaylarsınız.', color: 'from-violet-600 to-indigo-600 shadow-indigo-200' },
              { icon: Users, title: 'Müşteri Takibi', desc: 'Müşteri geçmişi, özel istekler, sipariş alışkanlıklları ve AI analizi tek ekranda.', color: 'from-sky-500 to-blue-600 shadow-sky-200' },
              { icon: ShoppingBag, title: 'Sipariş Yönetimi', desc: 'Sipariş süreçlerinizi anlık olarak takip edin, durum güncellemelerini ve kargo bilgilerini saniyeler içinde ekleyin; yapay zekâ asistanınız tüm değişiklikleri müşterilerinize otomatik olarak bildirsin.', color: 'from-orange-500 to-amber-500 shadow-orange-200' },
              { icon: Truck, title: 'Kargo Takibi', desc: 'Kargo bilgisi girildiğinde AI otomatik takip numarasını müşterinize iletir.', color: 'from-teal-500 to-emerald-600 shadow-teal-200' },
              { icon: BellRing, title: 'Bildirimler', desc: 'Yeni sipariş, ödeme, müşteri talepleri ve kargo bildirimleri anlık olarak gelir.', color: 'from-amber-500 to-yellow-500 shadow-amber-200' },
              { icon: Zap, title: 'Akıllı Satış Otomasyonu', desc: 'Tekrar sipariş hatırlatma, sepeti terk eden müşteriyi yakalama ve özel gün kampanyalarını yapay zekâ ile otomatik yürütün.', color: 'from-pink-500 to-fuchsia-600 shadow-pink-200' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="card group hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                  <div className={`bg-gradient-to-br ${f.color} w-10 h-10 rounded-lg flex items-center justify-center p-2.5 shadow-md`}><Icon className="w-5 h-5 text-white" /></div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mt-4">{f.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section id="entegrasyonlar" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center animate-gradient-text">Çoklu Kanal Entegrasyonları</h2>
          <p className="mt-2 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">Mevcut altyapınız ve iş süreçlerinizle %100 uyumlu, kesintisiz çalışma deneyimi.</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-5 mt-10">
            {[
              {
                icon: PhoneCall, shadow: 'shadow-blue-500/20',
                title: 'Akıllı Telefon & Ses Hattı',
                desc: 'Santral ve Sesli Arama Altyapısı',
                sub: 'Gelen telefon aramalarını yapay zekâ sesli asistanımızla karşılayın, konuşmaları siparişe dönüştürün.',
                color: 'from-blue-500 to-indigo-600',
              },
              {
                icon: WhatsAppIcon, shadow: 'shadow-emerald-500/20',
                title: 'WhatsApp Business',
                desc: 'Resmi İşletme Mesajlaşması',
                sub: 'Yapay zekâ asistanınız WhatsApp üzerinden müşterilerinizle 7/24 kesintisiz iletişim kursun, gelen soruları yanıtlayıp sipariş süreçlerini otomatik yönetsin.',
                color: 'from-emerald-500 to-green-600',
              },
              {
                icon: Instagram, shadow: 'shadow-fuchsia-500/20',
                title: 'Instagram DM',
                desc: 'Sosyal Medya Sipariş Yönetimi',
                sub: 'Yapay zekâ sayesinde Instagram DM mesajlarını kaçırmayın; gelen tüm soruları anında yanıtlayarak otomatik olarak siparişe dönüştürün.',
                color: 'from-fuchsia-500 to-rose-500',
              },
              {
                icon: MessageSquare, shadow: 'shadow-orange-500/20',
                title: 'SMS Sipariş',
                desc: 'Kısa Mesaj ile Sipariş Alma',
                sub: 'Müşterileriniz SMS ile sipariş versin; yapay zekâ asistanınız gelen mesajları anında okuyup yanıtlasın, sipariş olarak kaydetsin.',
                color: 'from-orange-400 to-orange-600',
              },
              {
                icon: Truck, shadow: 'shadow-orange-500/20',
                title: 'Kargo & Lojistik Bildirimi',
                desc: 'Yapay Zekâ Destekli Kargo Takibi',
                sub: 'Anlaşmalı kargonuzdan aldığınız takip kodunu panele girin; yapay zekâ asistanınız müşterinize anında bilgilendirme mesajı göndersin.',
                color: 'from-amber-500 to-orange-600',
              },
            ].map((f, idx) => {
              const Icon = f.icon;
              return (
                <div key={idx} className="group text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 ease-in-out">
                  <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg ${f.shadow} group-hover:shadow-xl transition-all`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white mt-4 text-sm">{f.title}</h4>
                  <p className="font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 text-xs mt-1">{f.desc}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">{f.sub}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-10 flex justify-center">
            <div className="inline-flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-indigo-50/80 via-purple-50/80 to-blue-50/80 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-blue-900/30 rounded-full text-sm text-indigo-700 dark:text-indigo-300 font-medium backdrop-blur-sm">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span>Gelişmiş Yapay Zekâ Altyapısı: Yüksek doğruluk payına sahip sesli ve metin tabanlı akıllı yapay zekâ teknolojileri.</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 mt-10 max-w-xl mx-auto">
            {[
              { value: '1000+', label: 'Sipariş/Saat' },
              { value: '%98', label: 'AI Başarı' },
              { value: '7/24', label: 'Kesintisiz' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold bg-ai-gradient bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Değer Kartları */}
      <section id="basari-hikayeleri" className="bg-slate-50 dark:bg-slate-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center animate-gradient-text">İşletmenizde Neleri Değiştiriyoruz?</h2>
          <p className="mt-2 text-center text-sm font-semibold text-slate-600 dark:text-slate-300 mb-10">SiparişAsistanı ile operasyonel yükü sıfırlayın, satışlarınızı katlayın.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Bot, title: '%98 Yapay Zekâ Başarısı', desc: 'Yoğun zamanlarda manuel not alırken yapılan hatalı adres, ürün ve telaffuz kayıtlarına son verin.', gradient: 'from-violet-500 to-purple-600' },
              { icon: Clock, title: '7/24 Kesintisiz Asistan', desc: 'Mesai saatleri dışında ve gece gelen hiçbir siparişi veya müşteri talebini kaçırmayın.', gradient: 'from-indigo-500 to-blue-600' },
              { icon: Truck, title: 'Otomatik Kargo & Takip', desc: 'Müşterilerinize kargo durum güncellemelerini ve takip kodlarını otomatik iletin.', gradient: 'from-amber-500 to-orange-600' },
              { icon: Globe, title: 'Tüm Kanallar Tek Panelde', desc: 'WhatsApp, Instagram, SMS ve Web sitenizden gelen siparişleri tek ekrandan yönetin.', gradient: 'from-cyan-500 to-teal-600' },
              { icon: Users, title: 'Müşteri Sadakati & CRM', desc: 'Müşterilerinizin geçmiş siparişlerini, özel isteklerini ve alışkanlıklarını hafızada tutun.', gradient: 'from-emerald-500 to-green-600' },
              { icon: TrendingUp, title: 'Zaman & Maliyet Tasarrufu', desc: 'Telefona bakma yükünü azaltın; hem personelden hem zamandan tasarruf ederek bütçenizi koruyun.', gradient: 'from-rose-500 to-pink-600' },
            ].map((card, i) => {
              const CardIcon = card.icon;
              return (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white mb-3 shadow-sm`}><CardIcon size={18} /></div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{card.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 leading-relaxed">{card.desc}</p>
              </div>
            )})}
          </div>
        </div>
      </section>

      {/* Hakkımızda */}
      <section id="hakkimizda" className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white p-4 rounded-2xl shadow-lg shadow-indigo-200 inline-flex items-center justify-center mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Dijital Dönüşüm Hikâyemiz</h2>
          <p className="mt-6 text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
            <span className="animate-gradient-text font-semibold">SiparişAsistanı</span>, yerel üreticilerin satış süreçlerini
            <span className="animate-gradient-text font-semibold"> yapay zekâ teknolojisiyle dijitalleştiren</span> yenilikçi bir sipariş & satış yönetim platformudur.
          </p>
          <p className="mt-4 text-slate-500 dark:text-slate-400 dark:text-slate-500 leading-relaxed max-w-2xl mx-auto">
            <span className="animate-gradient-text font-semibold">Sesli çağrıları, WhatsApp mesajlarını, SMS'leri, Instagram DM'lerini ve Web Sitenizdeki siparişleri akıllı yapay zekâ asistanımızla anında yanıtlayan</span> ve doğrudan siparişe dönüştüren altyapımız,
            geleneksel yöntemlerle satış yapan işletmelerin operasyonel yükünü hafifletmek
            için tasarlandı. Yöresel lezzetleri üreten esnafımızın <span className="animate-gradient-text font-semibold">dijital dönüşümüne öncülük ederek, verimliliği ve müşteri memnuniyetini en üst seviyeye çıkarıyoruz</span>.
          </p>

        </div>
      </section>

      {/* FAQ */}
      <section id="sss" className="bg-slate-50 dark:bg-slate-800 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center animate-gradient-text">Sıkça Sorulan Sorular</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="card !p-0 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-slate-900 dark:text-white hover:bg-slate-50 transition-colors">
                  {item.q}
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <div className="px-5 pb-4 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 leading-relaxed animate-slide-up">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KVKK AI Banner */}
      <section className="max-w-3xl mx-auto text-center py-12 px-4">
        <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white rounded-2xl shadow-lg shadow-indigo-200 mb-4">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent mb-4 tracking-tight">%100 KVKK & Veri Güvenliği Standardı</h3>
        <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed font-normal">
          SiparişAsistanı altyapısındaki tüm kişisel veri işleme ve güvenlik süreçleri, yapay zekâ destekli veri uyum platformu <a href="https://www.kvkkai.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-4 decoration-indigo-300 transition-colors">KVKK AI</a> altyapısı ile oluşturulmuş, uçtan uca denetlenerek güvence altına alınmıştır.
        </p>
      </section>

      {/* Demo Form */}
      <section id="demo" className="py-20">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold animate-gradient-text">Ücretsiz Demo Talep Edin</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400 dark:text-slate-500">Size özel canlı demo için bilgilerinizi bırakın, sizi arayalım.</p>

          {demoSent ? (
            <div className="mt-8 card text-center space-y-2 animate-fade-in">
              <Send className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-semibold text-slate-900 dark:text-white">Teşekkür Ederiz!</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Demo talebiniz alındı. En kısa sürede sizinle iletişime geçeceğiz.</p>
            </div>
          ) : (
            <form className="mt-8 space-y-3 text-left" onSubmit={handleDemoSubmit}>
              <input placeholder="Adınız Soyadınız" value={demoForm.name} onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })} className="input" required />
              <input placeholder="E-posta Adresiniz" type="email" value={demoForm.email} onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })} className="input" required />
              <input placeholder="Telefon Numaranız" value={demoForm.phone} onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })} className="input" required />
              <input placeholder="Firma Adı" value={demoForm.company} onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })} className="input" />
              <button type="submit" className="btn-primary w-full group" disabled={sending}>
                <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /> {sending ? 'Gönderiliyor...' : 'Gönder'}
              </button>
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-2">Demo talebiniz alındıktan sonra tarafınıza özel canlı demo planlanacaktır.</p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 dark:border-slate-700 py-8">
        <div className="max-w-6xl mx-auto px-6 space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-400 dark:text-slate-500 flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo2.png" alt="" className="w-5 h-5 object-contain" />
              <span>2026 SiparişAsistanı</span>
            </div>
            <div className="flex flex-wrap gap-4 items-center text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              <button onClick={() => { setLegalTitle('Platform Aydınlatma Metni'); setLegalBody(LEGAL_TEXTS.aydinlatma); setShowLegalModal(true); }} className="hover:text-indigo-600 transition-colors">Platform Aydınlatma Metni</button>
              <button onClick={() => { setLegalTitle('Gizlilik Sözleşmesi'); setLegalBody(LEGAL_TEXTS.gizlilik); setShowLegalModal(true); }} className="hover:text-indigo-600 transition-colors">Gizlilik Sözleşmesi</button>
              <button onClick={() => { setLegalTitle('Çerez Politikası'); setLegalBody(LEGAL_TEXTS.cerez); setShowLegalModal(true); }} className="hover:text-indigo-600 transition-colors">Çerez Politikası</button>
              <button onClick={() => { setLegalTitle('Kullanım Koşulları'); setLegalBody(LEGAL_TEXTS.kullanim); setShowLegalModal(true); }} className="hover:text-indigo-600 transition-colors">Kullanım Koşulları</button>
              <button onClick={() => { setLegalTitle('Hizmet Sözleşmesi'); setLegalBody(LEGAL_TEXTS.hizmet); setShowLegalModal(true); }} className="hover:text-indigo-600 transition-colors">Hizmet Sözleşmesi</button>
              <button onClick={() => setShowContactModal(true)} className="hover:text-indigo-600 transition-colors font-semibold">İletişim</button>
            </div>
          </div>
          <div className="text-center text-xs text-slate-400 dark:text-slate-500">
            SiparişAsistanı Ai — Yapay Zeka Ticari İşletim Sistemi
          </div>
        </div>
      </footer>

      {/* Cookie Banner */}
      {!cookieAccepted && (
        <div className="fixed bottom-4 left-4 z-50 max-w-md bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-indigo-100 shadow-2xl text-slate-800 animate-slide-up">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Çerez Aydınlatması</h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            Sitemizde deneyiminizi iyileştirmek, analiz yapmak ve sipariş süreçlerini kesintisiz yürütmek amacıyla zorunlu ve performans çerezleri kullanıyoruz. Detaylar için <a href="#" className="text-indigo-600 underline">Çerez Politikası</a> ve <a href="#" className="text-indigo-600 underline">Aydınlatma Metni</a>ni inceleyebilirsiniz.
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => { try { localStorage.setItem('cookie_accepted', 'true'); } catch {} setCookieAccepted(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-200">Kabul Et</button>
            <button onClick={() => setShowCookieModal(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-medium px-3 py-2 rounded-xl transition-all">Çerez Tercihleri</button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3">Çerez altyapısı KVKK AI standartları ile korunmaktadır.</p>
        </div>
      )}

      {/* Cookie Preferences Modal */}
      {showCookieModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCookieModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Çerez Tercihleri</h3>
              <button onClick={() => setShowCookieModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-800">Zorunlu Çerezler</span>
                  <span className="text-[10px] bg-slate-300 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">Her Zaman Aktif</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Oturum yönetimi, güvenlik ve platformun çalışması için gereklidir.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-800">Performans Çerezleri</span>
                  <button onClick={() => { try { const prefs = JSON.parse(localStorage.getItem('cookie_prefs') || '{"perf":true}'); prefs.perf = !prefs.perf; localStorage.setItem('cookie_prefs', JSON.stringify(prefs)); } catch {} setCookieAccepted(false); }}
                    className={`relative w-10 h-5 rounded-full transition-all ${(() => { try { return JSON.parse(localStorage.getItem('cookie_prefs') || '{"perf":true}').perf !== false; } catch { return true; } })() ? 'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-sm' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(() => { try { return JSON.parse(localStorage.getItem('cookie_prefs') || '{"perf":true}').perf !== false; } catch { return true; } })() ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Sayfa kullanım istatistikleri ve performans ölçümleri için kullanılır.</p>
              </div>
              <button onClick={() => { try { localStorage.setItem('cookie_accepted', 'true'); localStorage.setItem('cookie_prefs', JSON.stringify({perf: true})); } catch {} setCookieAccepted(true); setShowCookieModal(false); }}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-semibold shadow-md">Tümünü Kabul Et ve Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowContactModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bizimle İletişime Geçin</h3>
              <button onClick={() => { setShowContactModal(false); setContactSent(false); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X size={18} /></button>
            </div>
            {contactSent ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center"><CheckCircle2 size={24} className="text-white" /></div>
                <p className="font-semibold text-slate-900 dark:text-white">Mesajınız Alındı</p>
                <p className="text-sm text-slate-500">En kısa sürede size dönüş yapacağız.</p>
              </div>
            ) : (
              <form className="space-y-3" onSubmit={handleContactSubmit}>
                <input placeholder="Adınız Soyadınız" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" required />
                <input placeholder="E-posta Adresiniz" type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" required />
                <input placeholder="Telefon Numaranız" value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none" required />
                <textarea placeholder="Mesajınız" value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} rows={3} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none resize-none" required />
                <button type="submit" disabled={contactSending} className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50 transition-all">
                  {contactSending ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Legal Text Modal */}
      {showLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowLegalModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{legalTitle}</h3>
              <button onClick={() => setShowLegalModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto p-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{legalBody}</div>
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button onClick={() => setShowLegalModal(false)} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg text-xs font-semibold shadow-sm">Anladım</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
