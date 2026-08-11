'use client';

import { useState, useEffect } from 'react';
import { Bot, PhoneCall, ShoppingBag, Users, ArrowRight, CheckCircle2, ChevronRight, Sparkles, BellRing, ChevronDown, Truck, Send, MessageSquare, Star, CreditCard, BarChart3, Camera, Globe, Printer, MessageCircle, Building2, Crosshair, Rocket, TrendingUp, AlertCircle, Package, Clock, Store, Flame, Gift, ChefHat, Layers, Zap, ShieldCheck } from 'lucide-react';

const OMNICHANNEL_FLOW = [
  { icon: PhoneCall, label: 'Telefon', desc: 'Sesli arama', color: 'from-blue-500 to-blue-600' },
  { icon: MessageSquare, label: 'WhatsApp', desc: 'Mesajlaşma', color: 'from-emerald-500 to-emerald-600' },
  { icon: Camera, label: 'Instagram', desc: 'DM mesajı', color: 'from-pink-500 to-pink-600' },
  { icon: MessageSquare, label: 'SMS', desc: 'Kısa mesaj', color: 'from-sky-400 to-blue-500' },
  { icon: Globe, label: 'Web Sitesi', desc: 'Online sipariş', color: 'from-sky-500 to-sky-600' },
  { icon: Bot, label: 'AI Asistan', desc: 'Siparişi alır', color: 'from-violet-500 to-violet-600' },
  { icon: BarChart3, label: 'CRM', desc: 'Kayıt düşer', color: 'from-rose-500 to-rose-600' },
  { icon: MessageCircle, label: 'WhatsApp', desc: 'Gruba iletir', color: 'from-emerald-500 to-emerald-600' },
  { icon: Printer, label: 'Yazıcı', desc: 'Fiş çıkar', color: 'from-amber-500 to-amber-600' },
  { icon: Truck, label: 'Kargo', desc: 'Kargo kodu iletilir', color: 'from-cyan-500 to-cyan-600' },
  { icon: ShoppingBag, label: 'Raporlar', desc: 'Analiz', color: 'from-indigo-500 to-indigo-600' },
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

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [demoForm, setDemoForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [demoSent, setDemoSent] = useState(false);
  const [sending, setSending] = useState(false);

  const [cookieAccepted, setCookieAccepted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setActiveStep((prev) => (prev + 1) % OMNICHANNEL_FLOW.length), 2500);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => { try { setCookieAccepted(localStorage.getItem('cookie_accepted') === 'true'); } catch {} }, []);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: demoForm.company, ownerName: demoForm.name, ownerEmail: demoForm.email, phone: demoForm.phone }),
      });
    } catch {}
    setDemoSent(true);
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo2.png" alt="SiparişAsistanı" className="w-8 h-8 object-contain" />
            <span className="text-sm"><span className="font-bold text-slate-900">Sipariş</span><span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Asistanı</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((item) => (
              <a key={item.label} href={item.href}
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">{item.label}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors">Giriş</a>
            <a href="#demo" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 shadow-md shadow-indigo-200 text-white font-medium rounded-xl px-4 py-2 text-xs transition-all">Ücretsiz Dene</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section id="anasayfa" className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 rounded-full text-xs font-medium text-violet-700 mb-6 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" /> AI Destekli Sipariş Sistemi
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
          Telefon, WhatsApp, Instagram,
          <br />
          SMS ve Web sitenizden gelen siparişleri
          <br />
          <span className="animate-gradient-text">tek panelden yönetin</span>
        </h1>
        <p className="mt-4 text-lg max-w-2xl mx-auto leading-relaxed font-semibold">
          <span className="animate-gradient-text">Yapay Zekâ Siparişlerinizi Yönetsin,</span>
          <span className="text-slate-900"> Siz Satışlarınızı Büyütün.</span>
        </p>
        <p className="mt-3 text-sm text-violet-600 font-medium bg-violet-50 inline-block px-4 py-1 rounded-full">SiparişAsistanı Ai — Yapay Zeka Ticari İşletim Sistemi</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a href="#demo" className="btn-primary group"><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /> Ücretsiz Dene</a>
          <a href="#demo" className="btn-secondary">Hemen Bilgi Al</a>
        </div>

        {/* Mockup */}
        <div className="mt-16 relative max-w-4xl mx-auto">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-slate-400 ml-2">SiparişAsistanı - Kontrol Paneli</span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { val: '12', label: 'Bugün Sipariş', icon: ShoppingBag },
                  { val: '8.450 TL', label: 'Bugün Ciro', icon: TrendingUp },
                  { val: '%98', label: 'AI Başarı', icon: Bot },
                  { val: '3', label: 'Bekleyen', icon: AlertCircle },
                ].map((item, i) => {
                  const MIcon = item.icon;
                  return (
                  <div key={i} className="bg-slate-800/50 rounded-lg p-3 text-left border border-slate-700/50">
                    <div className="text-xs text-slate-500 flex items-center gap-1"><MIcon size={13} className="text-slate-400" /> {item.label}</div>
                    <div className="text-xl font-bold text-white mt-0.5">{item.val}</div>
                  </div>
                )})}
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  <span className="text-emerald-400 font-medium">🟢 AI Çalışıyor</span>
                  <span>•</span>
                  <span>Son Sipariş: 2 dk önce</span>
                  <span>•</span>
                  <span>Müşteri: Ahmet Y.</span>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-medium">✅ Onaylandı</span>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] font-medium">📞 Telefon</span>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-medium">💰 600 TL</span>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -z-10" />
          <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl -z-10" />
        </div>
      </section>

      {/* Omnichannel Flow */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
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
                  <p className="text-xs font-semibold text-slate-700 mt-2">{step.label}</p>
                  <p className="text-[11px] font-medium text-slate-500">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Nasıl Çalışır */}
      <section id="nasil-calisir" className="bg-slate-50/70 border-y border-slate-100 py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold text-slate-900 mb-8 text-center">Sipariş <span className="animate-gradient-text">Asistanı </span>Nasıl Çalışır?</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {OMNICHANNEL_FLOW.slice(5, 11).map((step, i) => {
              const Icon = step.icon;
              const isActive = (i + 5) === activeStep;
              return (
                <div key={i + 5} className="flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg transition-all duration-500 ${isActive ? 'scale-110 shadow-xl ring-4 ring-white/30' : ''}`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mt-2">{step.label}</p>
                  <p className="text-[11px] font-medium text-slate-500">{step.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-center gap-1 text-xs text-slate-400">
            {OMNICHANNEL_FLOW.map((_, i) => (
              <button key={i} onClick={() => setActiveStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === activeStep ? 'bg-violet-500 w-4' : 'bg-slate-300'}`} />
            ))}
          </div>
        </div>
      </section>

      {/* Sektör Kartları */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 mb-2">Geleceğin Ticaretine Güvenen İşletmeler</h2>
          <p className="text-center text-sm animate-gradient-text font-semibold mb-1">Geleneksel lezzetleri, yapay zekâ asistanı ile geleceğe taşıyanlar.</p>
          <p className="text-center text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1 mb-8">İster toptan, ister perakende; SiparişAsistanı iş modelinize anında uyum sağlar.</p>
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
              <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                <div className={`bg-gradient-to-br ${card.color} text-white p-3 rounded-xl shadow-md inline-flex items-center justify-center mb-3`}><CardIcon size={22} className="text-white" /></div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{card.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
              </div>
            )})}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="crm" className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900">Her Şey Tek Panelde</h2>
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
                  <h3 className="font-semibold text-slate-900 mt-4">{f.title}</h3>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{f.desc}</p>
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
          <p className="mt-2 text-center text-sm font-semibold text-slate-600">Mevcut altyapınız ve iş süreçlerinizle %100 uyumlu, kesintisiz çalışma deneyimi.</p>
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
                icon: MessageCircle, shadow: 'shadow-emerald-500/20',
                title: 'WhatsApp Business',
                desc: 'Resmi İşletme Mesajlaşması',
                sub: 'Yapay zekâ asistanınız WhatsApp üzerinden müşterilerinizle 7/24 kesintisiz iletişim kursun, gelen soruları yanıtlayıp sipariş süreçlerini otomatik yönetsin.',
                color: 'from-emerald-500 to-green-600',
              },
              {
                icon: Camera, shadow: 'shadow-fuchsia-500/20',
                title: 'Instagram DM',
                desc: 'Sosyal Medya Sipariş Yönetimi',
                sub: 'Yapay zekâ sayesinde Instagram DM mesajlarını kaçırmayın; gelen tüm soruları anında yanıtlayarak otomatik olarak siparişe dönüştürün.',
                color: 'from-fuchsia-500 to-rose-500',
              },
              {
                icon: MessageSquare, shadow: 'shadow-sky-500/20',
                title: 'SMS Sipariş',
                desc: 'Kısa Mesaj ile Sipariş Alma',
                sub: 'Müşterileriniz SMS ile sipariş versin; yapay zekâ asistanınız gelen mesajları anında okuyup yanıtlasın, sipariş olarak kaydetsin.',
                color: 'from-sky-400 to-blue-500',
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
                  <p className="font-semibold text-slate-500 dark:text-slate-400 text-xs mt-1">{f.desc}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{f.sub}</p>
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
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Değer Kartları */}
      <section id="basari-hikayeleri" className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center animate-gradient-text">İşletmenizde Neleri Değiştiriyoruz?</h2>
          <p className="mt-2 text-center text-sm font-semibold text-slate-600 mb-10">SiparişAsistanı ile operasyonel yükü sıfırlayın, satışlarınızı katlayın.</p>
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
              <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white mb-3 shadow-sm`}><CardIcon size={18} /></div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{card.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
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
          <h2 className="text-3xl font-bold text-slate-900">Dijital Dönüşüm Hikâyemiz</h2>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            <span className="animate-gradient-text font-semibold">SiparişAsistanı</span>, yerel üreticilerin satış süreçlerini
            <span className="animate-gradient-text font-semibold"> yapay zekâ teknolojisiyle dijitalleştiren</span> yenilikçi bir sipariş & satış yönetim platformudur.
          </p>
          <p className="mt-4 text-slate-500 leading-relaxed max-w-2xl mx-auto">
            <span className="animate-gradient-text font-semibold">Sesli çağrıları, WhatsApp mesajlarını, SMS'leri, Instagram DM'lerini ve Web Sitenizdeki siparişleri akıllı yapay zekâ asistanımızla anında yanıtlayan</span> ve doğrudan siparişe dönüştüren altyapımız,
            geleneksel yöntemlerle satış yapan işletmelerin operasyonel yükünü hafifletmek
            için tasarlandı. Yöresel lezzetleri üreten esnafımızın <span className="animate-gradient-text font-semibold">dijital dönüşümüne öncülük ederek, verimliliği ve müşteri memnuniyetini en üst seviyeye çıkarıyoruz</span>.
          </p>

        </div>
      </section>

      {/* FAQ */}
      <section id="sss" className="bg-slate-50 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center animate-gradient-text">Sıkça Sorulan Sorular</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="card !p-0 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-slate-900 hover:bg-slate-50 transition-colors">
                  {item.q}
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <div className="px-5 pb-4 text-sm text-slate-500 leading-relaxed animate-slide-up">{item.a}</div>}
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
        <p className="text-slate-600 text-sm md:text-base leading-relaxed font-normal">
          SiparişAsistanı altyapısındaki tüm kişisel veri işleme ve güvenlik süreçleri, yapay zekâ destekli veri uyum platformu <a href="https://www.kvkkai.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-4 decoration-indigo-300 transition-colors">KVKK AI</a> altyapısı ile oluşturulmuş, uçtan uca denetlenerek güvence altına alınmıştır.
        </p>
      </section>

      {/* Demo Form */}
      <section id="demo" className="py-20">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold animate-gradient-text">Ücretsiz Demo Talep Edin</h2>
          <p className="mt-2 text-slate-500">Size özel canlı demo için bilgilerinizi bırakın, sizi arayalım.</p>

          {demoSent ? (
            <div className="mt-8 card text-center space-y-2 animate-fade-in">
              <Send className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-semibold text-slate-900">Teşekkür Ederiz!</p>
              <p className="text-sm text-slate-500">Demo talebiniz alındı. En kısa sürede sizinle iletişime geçeceğiz.</p>
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
              <p className="text-xs text-slate-400 text-center mt-2">Demo talebiniz alındıktan sonra tarafınıza özel canlı demo planlanacaktır.</p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-6 space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-400 flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo2.png" alt="" className="w-5 h-5 object-contain" />
              <span>2026 SiparişAsistanı</span>
            </div>
            <div className="flex flex-wrap gap-4 items-center text-xs text-slate-500">
              <a href="#" className="hover:text-indigo-600 transition-colors">Platform Aydınlatma Metni</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Gizlilik Sözleşmesi</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Çerez Politikası</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Kullanım Koşulları</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Hizmet Sözleşmesi</a>
            </div>
          </div>
          <div className="text-center text-xs text-slate-400">
            SiparişAsistanı Ai — Yapay Zeka Ticari İşletim Sistemi
          </div>
        </div>
      </footer>

      {/* Cookie Banner */}
      {!cookieAccepted && (
        <div className="fixed bottom-4 left-4 z-50 max-w-md bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-indigo-100 shadow-2xl text-slate-800 animate-slide-up">
          <h4 className="text-sm font-bold text-slate-900 mb-2">Çerez Aydınlatması</h4>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Sitemizde deneyiminizi iyileştirmek, analiz yapmak ve sipariş süreçlerini kesintisiz yürütmek amacıyla zorunlu ve performans çerezleri kullanıyoruz. Detaylar için <a href="#" className="text-indigo-600 underline">Çerez Politikası</a> ve <a href="#" className="text-indigo-600 underline">Aydınlatma Metni</a>ni inceleyebilirsiniz.
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => { try { localStorage.setItem('cookie_accepted', 'true'); } catch {} setCookieAccepted(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-200">Kabul Et</button>
            <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-2 rounded-xl transition-all">Çerez Tercihleri</button>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">Çerez altyapısı KVKK AI standartları ile korunmaktadır.</p>
        </div>
      )}
    </div>
  );
}
