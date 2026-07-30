'use client';

import { useState, useEffect } from 'react';
import { Bot, PhoneCall, ShoppingBag, Users, ArrowRight, CheckCircle2, ChevronRight, Sparkles, BellRing, Shield, ChevronDown, Truck, Send, MessageSquare, Star, CreditCard, BarChart3, Camera, Globe, Printer, MessageCircle, Building2, Crosshair, Rocket } from 'lucide-react';

const OMNICHANNEL_FLOW = [
  { icon: PhoneCall, label: 'Telefon', desc: 'Sesli arama', color: 'from-blue-500 to-blue-600' },
  { icon: MessageSquare, label: 'WhatsApp', desc: 'Mesajlaşma', color: 'from-emerald-500 to-emerald-600' },
  { icon: Camera, label: 'Instagram', desc: 'DM mesajı', color: 'from-pink-500 to-pink-600' },
  { icon: Globe, label: 'Web Sitesi', desc: 'Online sipariş', color: 'from-sky-500 to-sky-600' },
  { icon: Bot, label: 'AI Asistan', desc: 'Siparişi alır', color: 'from-violet-500 to-violet-600' },
  { icon: BarChart3, label: 'CRM', desc: 'Kayıt düşer', color: 'from-rose-500 to-rose-600' },
  { icon: Printer, label: 'Yazıcı', desc: 'Fiş çıkar', color: 'from-amber-500 to-amber-600' },
  { icon: Truck, label: 'Kargo', desc: 'Kargo kodu iletilir', color: 'from-cyan-500 to-cyan-600' },
  { icon: ShoppingBag, label: 'Raporlar', desc: 'Analiz', color: 'from-indigo-500 to-indigo-600' },
];

const FAQ = [
  { q: 'SiparişAsistanı nedir?', a: 'SiparişAsistanı, gıda ve yöresel ürün üreticileri için geliştirilmiş yapay zekâ destekli bütünleşik bir sipariş, satış ve işletme yönetim platformudur. Telefon aramaları, WhatsApp mesajları ve Instagram DM üzerinden gelen tüm sipariş taleplerini yapay zekâ asistanı ile 7/24 otomatik olarak karşılar; sipariş detaylarını anında CRM panelinize işler. Müşterilerinize bilgilendirme ve kargo takip mesajlarını otomatik olarak iletir. Size sadece siparişleri paketleyip göndermek kalır.' },
  { q: 'SiparişAsistanı nasıl çalışır?', a: 'Telefon, WhatsApp ve Instagram\'dan gelen tüm müşteri çağrılarını ve mesajlarını yapay zekâ ajanlarımız karşılar. Müşterinizin talebini anlayıp siparişi alır; adres ve sipariş detaylarını doğrulayarak yönetim panelinize, WhatsApp grubunuza ve fiş yazıcınıza anında iletir. Size sadece siparişi paketleyip göndermek kalır.' },
  { q: 'Sistemi kurmak ne kadar sürer? Teknik bilgiye ihtiyacım var mı?', a: 'Hiçbir teknik bilgiye veya yazılımcıya ihtiyacınız yoktur. Ekibimiz tüm entegrasyon süreçlerini sizin adınıza tamamlar ve sisteminizi aynı gün içinde (veya 24 saat içinde) kullanıma hazır hale getirir.' },
  { q: 'SiparişAsistanı hangi sektörler için uygundur?', a: 'SiparişAsistanı; başta sucuk, lokum, şarküteri, bükme, yumurta ve yerel lezzet üreticileri olmak üzere, tüm yöresel gıda üreticileri ve işletmeler için özel olarak tasarlanmıştır. Telefon ve sosyal medya üzerinden yoğun sipariş trafiği yöneten her ölçekteki üretici için %100 uyumludur.' },
  { q: 'Kargo takibi nasıl çalışır?', a: 'Siparişiniz kargoya verildiğinde, aldığınız takip kodunu panele girmeniz yeterlidir. Yapay zekâ asistanınız; kargo firması, takip numarası ve sorgulama bağlantısını içeren kişiselleştirilmiş bilgilendirme mesajını müşterinizin WhatsApp hesabına anında ve otomatik olarak iletir. Böylece "Kargom nerede?" sorularıyla vakit kaybetmezsiniz.' },
  { q: 'Telefon hattıma bağlanabiliyor mu?', a: 'Evet. Mevcut sabit veya kurumsal telefon hattınızla %100 uyumlu şekilde çalışır. Yeni bir hat satın almanıza veya numaranızı değiştirmenize gerek kalmadan, mevcut numaranızı yapay zekâ asistanımıza saniyeler içinde entegre edebilirsiniz.' },
  { q: 'WhatsApp ve Instagram üzerinden sipariş alabilir miyim?', a: 'Evet. Sistemimiz WhatsApp Business API ve Instagram DM altyapılarıyla %100 entegre çalışır. Yapay zekâ asistanınız, müşterilerinizden gelen mesajları 7/24 anında yanıtlar, siparişleri otomatik olarak alır ve kargo takip bilgilendirmelerini müşterilerinize kesintisiz olarak iletir.' },
  { q: 'Müşteri ve sipariş verilerimiz güvende mi?', a: 'Evet, %100 güvendedir. Platformumuz tam izole veri mimarisiyle çalışır. İşletmenize ve müşterilerinize ait tüm veriler yüksek güvenlikli sunucularda, uçtan uca şifrelenerek saklanır. Verilerinize sizden başka hiçbir işletme veya üçüncü taraf kesinlikle erişemez.' },
  { q: 'Yapay zekânın aldığı siparişlere müdahale edebilir miyim?', a: 'Dilediğiniz zaman. Yönetim paneliniz üzerinden tüm canlı görüşmeleri ve mesajlaşmaları anlık görebilir, gerektiğinde yapay zekâyı devreden çıkarıp konuşmaya veya sipariş detayına tek tıkla müdahale edebilirsiniz.' },
  { q: 'Mesai saatleri dışında veya hafta sonu sistem çalışmaya devam eder mi?', a: 'Evet, 7 gün 24 saat kesintisiz çalışır. İşletmeniz kapalı olsa bile yapay zekâ asistanınız gelen tüm aramaları ve mesajları yanıtlar, siparişleri toplar ve ertesi güne hazır hale getirir.' },
  { q: 'Kullandığım muhasebe veya stok programına entegre oluyor mu?', a: 'Evet. SiparişAsistanı, kullandığınız mevcut muhasebe, stok ve ERP sistemleriyle (Logo, Luca, Mikro, Akınsoft, Nebim vb.) tam uyumlu çalışarak siparişleri doğrudan sisteminize aktarabilir.' },
];

const NAV_LINKS = [
  { label: 'Anasayfa', href: '#anasayfa' },
  { label: 'CRM', href: '#crm' },
  { label: 'Entegrasyonlar', href: '#entegrasyonlar' },
  { label: 'Başarı Hikayeleri', href: '#basari-hikayeleri' },
  { label: 'Hakkımızda', href: '#hakkimizda' },
  { label: 'SSS', href: '#sss' },
  { label: 'İletişim', href: '#demo' },
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

  useEffect(() => {
    const interval = setInterval(() => setActiveStep((prev) => (prev + 1) % OMNICHANNEL_FLOW.length), 2500);
    return () => clearInterval(interval);
  }, []);

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
          <div className="flex items-center gap-2">
            <img src="/logo2.png" alt="SiparişAsistanı" className="w-7 h-7 object-contain" />
            <span className="font-semibold text-sm text-slate-900">SiparişAsistanı</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((item) => (
              <a key={item.label} href={item.href}
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors">{item.label}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Giriş</a>
            <a href="#demo" className="btn-primary text-xs">Ücretsiz Dene</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section id="anasayfa" className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 rounded-full text-xs font-medium text-violet-700 mb-6 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" /> AI Destekli Sipariş Sistemi
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
          Telefon, WhatsApp, Instagram
          <br />
          ve Web sitenizden gelen siparişleri
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
                  { val: '12', label: 'Bugün Sipariş', icon: '📦' },
                  { val: '8.450 TL', label: 'Bugün Ciro', icon: '💰' },
                  { val: '%98', label: 'AI Başarı', icon: '🤖' },
                  { val: '3', label: 'Bekleyen', icon: '⏳' },
                ].map((item, i) => (
                  <div key={i} className="bg-slate-800/50 rounded-lg p-3 text-left border border-slate-700/50">
                    <div className="text-xs text-slate-500">{item.icon} {item.label}</div>
                    <div className="text-xl font-bold text-white mt-0.5">{item.val}</div>
                  </div>
                ))}
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

        {/* Omnichannel Flow */}
        <div className="mt-20 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            Tüm satış kanallarınızı <span className="animate-gradient-text">tek bir platformda</span> birleştirin
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-9 gap-3">
            {OMNICHANNEL_FLOW.map((step, i) => {
              const Icon = step.icon;
              const isActive = i === activeStep;
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg transition-all duration-500 ${isActive ? 'scale-110 shadow-xl ring-4 ring-white/30' : ''}`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-2">{step.label}</p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{step.desc}</p>
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

      {/* Referanslar */}
      <section className="pb-20 -mt-8">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-lg font-bold animate-gradient-text mb-2 tracking-wider">GELECEĞİN TİCARETİNE GÜVENEN İŞLETMELER</p>
          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mb-6">Geleneksel lezzetleri, yapay zekâ asistanı ile geleceğe taşıyanlar.</p>
          <div className="grid grid-cols-4 gap-3">
            {REFERENCES.map((name, i) => (
              <div key={i} className="bg-slate-50 rounded-xl px-4 py-3 text-center border border-slate-100 group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold mx-auto mb-1.5">{name[0]}</div>
                <p className="text-xs font-medium text-slate-700">{name}</p>
                <p className="text-[10px] text-slate-400">Afyon</p>
              </div>
            ))}
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
              { icon: Bot, title: 'AI Sipariş Alma', desc: 'Telefon, Instagram ve WhatsApp üzerinden gelen siparişleri AI otomatik alır, siz sadece onaylarsınız.' },
              { icon: Users, title: 'Müşteri Takibi', desc: 'Müşteri geçmişi, şikayetleri, siparişleri ve AI analizi tek ekranda.' },
              { icon: ShoppingBag, title: 'Sipariş Yönetimi', desc: 'Sipariş süreçlerinizi anlık olarak takip edin, durum güncellemelerini ve kargo bilgilerini saniyeler içinde ekleyin; yapay zekâ asistanınız tüm değişiklikleri müşterilerinize otomatik olarak bildirsin.' },
              { icon: Truck, title: 'Kargo Takibi', desc: 'Kargo bilgisi girildiğinde AI otomatik WhatsApp\'tan takip numarasını müşterinize iletir.' },
              { icon: BellRing, title: 'Bildirimler', desc: 'Yeni sipariş, ödeme, şikayet ve kargo bildirimleri anlık olarak gelir.' },
              { icon: Shield, title: 'Güvenli', desc: 'Multi-tenant altyapı ile verileriniz sadece sizin erişiminize özeldir.' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="card group hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                  <div className="w-10 h-10 rounded-lg bg-ai-gradient flex items-center justify-center"><Icon className="w-5 h-5 text-white" /></div>
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
          <p className="mt-2 text-center text-slate-500">Mevcut altyapınız ve iş süreçlerinizle %100 uyumlu, kesintisiz çalışma deneyimi.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-10">
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

      {/* Başarı Hikayeleri */}
      <section id="basari-hikayeleri" className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center animate-gradient-text">Başarı Hikayeleri</h2>
          <p className="mt-2 text-center text-base font-semibold"><span className="animate-gradient-text">SiparişAsistanı</span><span className="text-slate-700 dark:text-slate-300"> ile işletmesini dönüştürenler</span></p>
          <div className="grid grid-cols-3 gap-6 mt-10">
            {[
              { quote: 'Telefon susmuyordu artık AI bakıyor. Ben de işime odaklanıyorum.', name: 'Zafer Ayyıldız', title: 'Zafer Sucukları', city: 'Afyon' },
              { quote: 'WhatsApp\'tan gelen siparişler otomatik sisteme düşüyor. Hata neredeyse sıfır.', name: 'Mehmet Öztürk', title: 'Öztürk Lokum', city: 'Afyon' },
              { quote: 'Günde 40-50 sipariş alıyorduk. AI geldikten sonra hiçbirini kaçırmıyoruz.', name: 'Ali Kaya', title: 'Kaya Bükmeleri', city: 'Afyon' },
              { quote: 'Müşteri memnuniyeti çok arttı. AI her arayana kibarca cevap veriyor.', name: 'İbrahim Yıldız', title: 'Yıldız Sucuk', city: 'İstanbul' },
              { quote: 'Siparişleri elle yazmayı unuttuk. AI alıyor, biz gönderiyoruz.', name: 'Hatice Çelik', title: 'Çelik Lokumları', city: 'Ankara' },
              { quote: 'Kargo takibini AI yapıyor. Müşteriye WhatsApp\'tan bilgi gidiyor.', name: 'Mustafa Şahin', title: 'Şahin Et Ürünleri', city: 'Afyon' },
            ].map((story, i) => (
              <div key={i} className="card group hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-amber-400 fill-current" />)}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">"{story.quote}"</p>
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-ai-gradient flex items-center justify-center text-white text-sm font-bold">{story.name[0]}</div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{story.name}</p>
                    <p className="text-xs text-slate-500">{story.title} · {story.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hakkımızda */}
      <section id="hakkimizda" className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Hakkımızda</h2>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            <span className="animate-gradient-text font-semibold">SiparişAsistanı</span>, yerel üreticilerin satış süreçlerini
            <span className="animate-gradient-text font-semibold"> yapay zekâ teknolojisiyle dijitalleştiren</span> yenilikçi bir sipariş & satış yönetim platformudur.
          </p>
          <p className="mt-4 text-slate-500 leading-relaxed max-w-2xl mx-auto">
            <span className="animate-gradient-text font-semibold">Sesli çağrıları, WhatsApp mesajlarını ve Instagram DM'lerini akıllı yapay zekâ asistanımızla anında yanıtlayan</span> ve doğrudan siparişe dönüştüren altyapımız,
            geleneksel yöntemlerle satış yapan işletmelerin operasyonel yükünü hafifletmek
            için tasarlandı. Yöresel lezzetleri üreten esnafımızın <span className="animate-gradient-text font-semibold">dijital dönüşümüne öncülük ederek, verimliliği ve müşteri memnuniyetini en üst seviyeye çıkarıyoruz</span>.
          </p>

        </div>
      </section>

      {/* FAQ */}
      <section id="sss" className="bg-slate-50 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900">Sıkça Sorulan Sorular</h2>
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
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <img src="/logo2.png" alt="" className="w-5 h-5 object-contain" />
            <span>2026 SiparişAsistanı</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs">SiparişAsistanı Ai — Yapay Zeka Ticari İşletim Sistemi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
