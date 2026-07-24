'use client';

import { useState, useEffect } from 'react';
import { Bot, PhoneCall, ShoppingBag, Users, ArrowRight, CheckCircle2, ChevronRight, Sparkles, BellRing, Shield, ChevronDown, Truck, Send, MessageSquare, Star } from 'lucide-react';

const FLOW_STEPS = [
  { icon: PhoneCall, label: 'Musteri Arar', desc: 'Telefon veya WhatsApp', color: 'bg-blue-500' },
  { icon: Bot, label: 'AI Anlar', desc: 'Dogal dil ile siparis', color: 'bg-violet-500' },
  { icon: ShoppingBag, label: 'Siparis Olusur', desc: 'Otomatik kaydedilir', color: 'bg-emerald-500' },
  { icon: Truck, label: 'Kargo Hazir', desc: 'Takip no iletilir', color: 'bg-amber-500' },
];

const FAQ = [
  { q: 'SiparişAsistanı nedir?', a: 'Yöresel üreticiler için AI destekli sipariş ve işletme yönetim sistemidir. Telefon ve WhatsApp üzerinden gelen siparişleri yapay zeka ile otomatik alır, CRM\'e işler ve panelde gösterir.' },
  { q: 'Kurulum ne kadar sürer?', a: '10 dakikada sistemi kurup çalıştırmaya başlayabilirsiniz. Firma bilgilerinizi girin, ürünlerinizi ekleyin, AI hemen çalışmaya başlasın.' },
  { q: 'Hangi sektörler için uygun?', a: 'Sucuk, lokum, bükme, yumurta gibi yöresel üreticiler için özel olarak tasarlanmıştır.' },
  { q: 'Kargo takibi nasıl çalışır?', a: 'Sipariş hazırlandıktan sonra kargo bilgisini sisteme girersiniz. AI otomatik olarak müşterinin WhatsApp\'ına kargo firması ve takip numarasını içeren bir mesaj gönderir.' },
  { q: 'Telefon hattıma bağlanabiliyor mu?', a: 'Evet. NetGSM üzerinden mevcut telefon hattınıza bağlanır. Yeni hat almadan kullanabilirsiniz.' },
  { q: 'WhatsApp ile çalışıyor mu?', a: 'Evet. WhatsApp Business API üzerinden müşterilerinizle mesajlaşabilir, sipariş alabilir ve bildirim gönderebilirsiniz.' },
  { q: 'Müşteri bilgileri güvende mi?', a: 'Evet. Multi-tenant altyapı ile her firmanın verileri tamamen izole edilmiştir. Sadece sizin erişebileceğiniz şekilde saklanır.' },
  { q: 'Mevcut telefon numaramı kullanabilir miyim?', a: 'Evet. Mevcut telefon hattınıza yönlendirme yaparak sistemi kullanmaya başlayabilirsiniz.' },
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

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [demoForm, setDemoForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [demoSent, setDemoSent] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setActiveStep((prev) => (prev + 1) % FLOW_STEPS.length), 2000);
    return () => clearInterval(interval);
  }, []);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSent(true);
    // TODO: Send email notification to admin
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-ai-gradient flex items-center justify-center text-white text-xs font-bold">S</div>
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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 rounded-full text-xs font-medium text-violet-700 mb-6">
          <Sparkles className="w-3.5 h-3.5" /> AI Destekli Sipariş Sistemi
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight">
          Telefon Siparişlerini
          <br />
          <span className="bg-ai-gradient bg-clip-text text-transparent">Yapay Zeka ile</span>
          <br />
          Otomatikleştirin
        </h1>
        <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">Yöresel Üreticiler için AI destekli sipariş ve işletme yönetim sistemi.</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a href="#demo" className="btn-primary"><ArrowRight className="w-4 h-4" /> Ücretsiz Dene</a>
          <a href="#demo" className="btn-secondary">Hemen Bilgi Al</a>
        </div>

        {/* Mockup */}
        <div className="mt-16 relative max-w-4xl mx-auto">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-slate-400 ml-2">SiparisAsistani - Kontrol Paneli</span>
            </div>
            <div className="p-6 grid grid-cols-4 gap-3">
              {['12', '8.450 TL', '%98', '3'].map((val, i) => (
                <div key={i} className="bg-slate-800 rounded-lg p-3 text-left">
                  <div className="text-xs text-slate-500">{['Bugun Siparis', 'Bugun Ciro', 'AI Basari', 'Bekleyen'][i]}</div>
                  <div className="text-lg font-bold text-white mt-0.5">{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Flow */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            {FLOW_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = i === activeStep;
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-700 ${isActive ? `${step.color} shadow-lg shadow-violet-500/25 scale-110` : 'bg-slate-100'}`}>
                      <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <p className={`text-xs mt-2 font-medium transition-colors ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                    <p className="text-[10px] text-slate-400">{step.desc}</p>
                  </div>
                  {i < FLOW_STEPS.length - 1 && <ChevronRight className="w-5 h-5 text-slate-300 -mt-8" />}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="crm" className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900">Her Şey Tek Panelde</h2>
          <div className="grid grid-cols-3 gap-6 mt-12">
            {[
              { icon: Bot, title: 'AI Sipariş Alma', desc: 'Telefon ve WhatsApp üzerinden gelen siparişleri AI otomatik alır, siz sadece onaylarsınız.' },
              { icon: Users, title: 'Müşteri Takibi', desc: 'Müşteri geçmişi, şikayetleri, siparişleri ve AI analizi tek ekranda.' },
              { icon: ShoppingBag, title: 'Sipariş Yönetimi', desc: 'Sipariş aşamalarını takip edin, durumunu değiştirin, kargo bilgisi ekleyin.' },
              { icon: Truck, title: 'Kargo Takibi', desc: 'Kargo bilgisi girildiğinde AI otomatik WhatsApp\'tan takip numarasını müşterinize iletir.' },
              { icon: BellRing, title: 'Bildirimler', desc: 'Yeni sipariş, ödeme, şikayet ve kargo bildirimleri anlık olarak gelir.' },
              { icon: Shield, title: 'Güvenli', desc: 'Multi-tenant altyapı ile verileriniz sadece sizin erişiminize özeldir.' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="card hover:shadow-premium-hover transition-all">
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
          <h2 className="text-3xl font-bold text-center text-slate-900">Entegrasyonlar</h2>
          <p className="mt-2 text-center text-slate-500">Mevcut altyapınızla sorunsuz çalışır</p>
          <div className="grid grid-cols-4 gap-5 mt-10">
            {[
              { icon: PhoneCall, title: 'NetGSM', desc: 'Telefon hatti entegrasyonu', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
              { icon: MessageSquare, title: 'WhatsApp', desc: 'Isletme mesajlasmasi', color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50' },
              { icon: Truck, title: 'Kargo', desc: 'MNG, Yurtici, Aras', color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50' },
              { icon: Bot, title: 'AI', desc: 'DeepSeek / OpenAI', color: 'from-violet-500 to-violet-600', bg: 'bg-violet-50' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="card text-center hover:shadow-premium-hover transition-all group">
                  <div className={`w-14 h-14 mx-auto rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-all`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mt-4">{f.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Başarı Hikayeleri */}
      <section id="basari-hikayeleri" className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900">Başarı Hikayeleri</h2>
          <p className="mt-2 text-center text-slate-500">SiparişAsistanı ile işletmesini dönüştürenler</p>
          <div className="grid grid-cols-3 gap-6 mt-10">
            {[
              { quote: 'Telefon susmuyordu artık AI bakıyor. Ben de işime odaklanıyorum.', name: 'Zafer Ayyıldız', title: 'Zafer Sucukları', city: 'Afyon' },
              { quote: 'WhatsApp\'tan gelen siparişler otomatik sisteme düşüyor. Hata neredeyse sıfır.', name: 'Mehmet Öztürk', title: 'Öztürk Lokum', city: 'Afyon' },
              { quote: 'Günde 40-50 sipariş alıyorduk. AI geldikten sonra hiçbirini kaçırmıyoruz.', name: 'Ali Kaya', title: 'Kaya Bükmeleri', city: 'Afyon' },
              { quote: 'Müşteri memnuniyeti çok arttı. AI her arayana kibarca cevap veriyor.', name: 'İbrahim Yıldız', title: 'Yıldız Sucuk', city: 'İstanbul' },
              { quote: 'Siparişleri elle yazmayı unuttuk. AI alıyor, biz gönderiyoruz.', name: 'Hatice Çelik', title: 'Çelik Lokumları', city: 'Ankara' },
              { quote: 'Kargo takibini AI yapıyor. Müşteriye WhatsApp\'tan bilgi gidiyor.', name: 'Mustafa Şahin', title: 'Şahin Et Ürünleri', city: 'Afyon' },
            ].map((story, i) => (
              <div key={i} className="card">
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
          <h2 className="text-3xl font-bold text-slate-900">Hakkımızda</h2>
          <p className="mt-6 text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
            SiparişAsistanı, yerel üreticilerin satış süreçlerini yapay zekâ teknolojisiyle
            dijitalleştiren yenilikçi bir sipariş yönetim platformudur.
          </p>
          <p className="mt-4 text-slate-500 leading-relaxed max-w-2xl mx-auto">
            Sesli çağrıları ve WhatsApp mesajlarını otomatik olarak siparişe dönüştüren altyapımız,
            geleneksel yöntemlerle sipariş alan işletmelerin operasyonel yükünü hafifletmek üzere
            tasarlandı. Yöresel lezzetleri üreten esnafımızın dijital dönüşümüne öncülük ederek,
            verimliliği ve müşteri memnuniyetini en üst seviyeye çıkarıyoruz.
          </p>
          <div className="grid grid-cols-3 gap-6 mt-10">
            {[
              { value: '1000+', label: 'Sipariş/Saat' },
              { value: '%98', label: 'AI Başarı' },
              { value: '7/24', label: 'Kesintisiz' },
            ].map((stat, i) => (
              <div key={i} className="card text-center">
                <div className="text-3xl font-bold bg-ai-gradient bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
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
          <h2 className="text-3xl font-bold text-slate-900">Ücretsiz Demo Talep Edin</h2>
          <p className="mt-2 text-slate-500">Size özel canlı demo için bilgilerinizi bırakın, sizi arayalım.</p>

          {demoSent ? (
            <div className="mt-8 card text-center space-y-2">
              <Send className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-semibold text-slate-900">Tesekkur Ederiz!</p>
              <p className="text-sm text-slate-500">Demo talebiniz alindi. En kisa surede sizinle iletisime gececegiz.</p>
            </div>
          ) : (
            <form className="mt-8 space-y-3 text-left" onSubmit={handleDemoSubmit}>
              <input placeholder="Adiniz Soyadiniz" value={demoForm.name} onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })} className="input" required />
              <input placeholder="E-posta Adresiniz" type="email" value={demoForm.email} onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })} className="input" required />
              <input placeholder="Telefon Numaraniz" value={demoForm.phone} onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })} className="input" required />
              <input placeholder="Firma Adi" value={demoForm.company} onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })} className="input" />
              <button type="submit" className="btn-primary w-full"><Send className="w-4 h-4" /> Gonder</button>
              <p className="text-xs text-slate-400 text-center mt-2">Demo talebiniz alındıktan sonra tarafınıza özel canlı demo planlanacaktır.</p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-ai-gradient flex items-center justify-center text-white text-[8px] font-bold">S</div>
            <span>2026 SiparişAsistanı</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/login" className="hover:text-slate-600">Giriş</a>
            <a href="#demo" className="hover:text-slate-600">İletişim</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
