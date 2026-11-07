import { Injectable, Logger } from '@nestjs/common';
import { BusinessInfoComponent } from './components/business-info.component';
import { ProductCatalogComponent } from './components/product-catalog.component';
import { PaymentMethodsComponent } from './components/payment-methods.component';
import { ConversationRulesComponent } from './components/conversation-rules.component';
import { CustomerContextComponent } from './components/customer-context.component';
import { TaskDefinitionComponent } from './components/task-definition.component';
import { SalesCoachComponent } from './components/sales-coach.component';
import { ScopeRulesComponent } from './components/scope-rules.component';
import { SpeechStyleComponent } from './components/speech-style.component';
import { CampaignsService } from '../../campaigns/campaigns.service';
import { AiMemoryService } from '../memory/ai-memory.service';
import { SupabaseService } from '../../common/supabase.client';

export interface PromptContext {
  tenantId: string;
  tenantName?: string;
  customerPhone?: string;
  customerName?: string;
  customerId?: string;
  customerBirthday?: string;
  channel: 'phone' | 'whatsapp' | 'instagram' | 'sms';
  currentState: string;
  collectedData?: Record<string, unknown>;
  /** true ise müşteri hafızası (geçmiş sipariş/isim) prompt'a eklenmez (test sıfırlama). */
  skipMemory?: boolean;
  /** true ise IBAN ödemesi dekont bekliyor; doğum günü/numara sorulmaz. */
  pendingDekont?: boolean;
  /** true ise IBAN dekontu zaten alındı; tekrar dekont istenmez. */
  dekontReceived?: boolean;
}

@Injectable()
export class PromptEngineService {
  private readonly logger = new Logger(PromptEngineService.name);

  constructor(
    private readonly businessInfo: BusinessInfoComponent,
    private readonly productCatalog: ProductCatalogComponent,
    private readonly paymentMethods: PaymentMethodsComponent,
    private readonly rules: ConversationRulesComponent,
    private readonly customerCtx: CustomerContextComponent,
    private readonly taskDef: TaskDefinitionComponent,
    private readonly salesCoach: SalesCoachComponent,
    private readonly scopeRules: ScopeRulesComponent,
    private readonly speechStyle: SpeechStyleComponent,
    private readonly memory: AiMemoryService,
    private readonly campaigns: CampaignsService,
    private readonly supabase: SupabaseService,
  ) {}

  async buildSystemPrompt(ctx: PromptContext): Promise<string> {
    const sections = await Promise.all([
      this.businessInfo.render(ctx),
      this.productCatalog.render(ctx),
      this.paymentMethods.render(ctx),
      this.campaigns.renderCampaignPrompt(ctx.tenantId),
      this.salesCoach.render(ctx),
      this.scopeRules.render(ctx),
      ctx.skipMemory ? '' : this.memory.buildContext(ctx.tenantId, ctx.customerPhone),
      this.rules.render(ctx),
      this.customerCtx.render(ctx),
      this.taskDef.render(ctx),
    ]);

    return sections.filter(Boolean).join('\n\n');
  }

  /**
   * Sesli realtime sipariş AI için sıcak/insan gibi sistem talimatı (Gemini Live).
   * Mevcut buildSystemPrompt'u DEĞİŞTİRMEZ; metin beyni için ayrıdır.
   * Bilgi bölümleri (işletme/ürün/ödeme/kampanya) yeniden kullanılır; kural kısmı sesli sohbete göre yazılır.
   */
  async buildRealtimeOrderPrompt(ctx: PromptContext): Promise<string> {
    const info = await Promise.all([
      this.businessInfo.render(ctx),
      this.productCatalog.render(ctx),
      this.paymentMethods.render(ctx),
      this.campaigns.renderCampaignPrompt(ctx.tenantId),
      Promise.resolve(this.speechStyle.render()),
    ]);

    // Fatura davranışı (metin beyin ile aynı ayarlar) — P63
    let invoiceRule = 'Fatura bilgisi HİÇ sorma.';
    try {
      const { data } = await this.supabase.db.from('tenant_settings')
        .select('invoice_enabled, invoice_ai_behavior, invoice_limit, invoice_remote_auto')
        .eq('tenant_id', ctx.tenantId).maybeSingle();
      invoiceRule = this.realtimeInvoiceRule((data || {}) as any);
    } catch { /* yoksay */ }

    // Kargo bilgisi (P70) + ücretsiz kargo davranışı (P94)
    let cargoInfo = 'Kargo ücreti/teslimat bilgisi sistemde TANIMLI DEĞİL.';
    let freeShipText = '';
    try {
      const { data } = await this.supabase.db.from('tenant_settings')
        .select('cargo_default_price, default_cargo_company, yurtici_enabled, yurtici_price, mng_enabled, mng_price, aras_enabled, aras_price, free_shipping_min, cargo_free_enabled, cargo_free_type, cargo_free_threshold, cargo_free_weight, cargo_free_quantity, city_delivery_time, intercity_cargo_time')
        .eq('tenant_id', ctx.tenantId).maybeSingle();
      const c = (data || {}) as any;
      const tl = (n: any) => Number(n || 0).toLocaleString('tr-TR');
      const parts: string[] = [];
      if (Number(c.cargo_default_price) > 0) parts.push(`Varsayılan kargo ücreti: ${tl(c.cargo_default_price)} TL`);
      if (c.yurtici_enabled && Number(c.yurtici_price) > 0) parts.push(`Yurtiçi Kargo: ${tl(c.yurtici_price)} TL`);
      if (c.mng_enabled && Number(c.mng_price) > 0) parts.push(`MNG Kargo: ${tl(c.mng_price)} TL`);
      if (c.aras_enabled && Number(c.aras_price) > 0) parts.push(`Aras Kargo: ${tl(c.aras_price)} TL`);
      if (c.cargo_free_enabled) {
        const type = String(c.cargo_free_type || 'amount');
        if (type === 'weight' && Number(c.cargo_free_weight) > 0) freeShipText = `${tl(c.cargo_free_weight)} kg ve üzeri alışverişlerde`;
        else if (type === 'quantity' && Number(c.cargo_free_quantity) > 0) freeShipText = `${tl(c.cargo_free_quantity)} adet ve üzeri alışverişlerde`;
        else if (Number(c.cargo_free_threshold) > 0) freeShipText = `${tl(c.cargo_free_threshold)} TL ve üzeri siparişlerde`;
        if (freeShipText) parts.push(`Ücretsiz kargo: ${freeShipText}`);
      }
      if (c.city_delivery_time) parts.push(`Şehir içi teslimat: ${c.city_delivery_time}`);
      if (c.intercity_cargo_time) parts.push(`Şehirler arası: ${c.intercity_cargo_time}`);
      if (parts.length) cargoInfo = parts.join('. ') + '.';
    } catch { /* yoksay */ }

    const freeShipRule = freeShipText
      ? [
          `ÜCRETSİZ KARGO VAR: ${freeShipText}.`,
          '- Müşterinin siparişi eşiği KARŞILIYORSA (eşit veya üstü) doğal şekilde belirt: "X kg ve üzeri alışverişlerde kargo ücretsiz; siz de X kg seçtiğiniz için kargonuz ücretsiz olacak."',
          '- Müşteri eşiğin YALNIZCA 1 birim altındaysa (örn. eşik 3 kg iken 2 kg) ISRAR ETMEDEN nazikçe teklif et: "İsterseniz 3 kg üzeri alımlarda kargo ücretsiz oluyor; siparişinizi 3 kg yapalım mı?"',
          '- Müşteri eşiğin 2 birim veya daha fazla altındaysa (örn. eşik 3 iken 1 kg) teklif ETME (saçma olur). Müşteri ücretsiz kargoyu SORARSA eşiği söyle.',
        ].join('\n')
      : 'Ücretsiz kargo TANIMLI DEĞİL; ücretsiz kargo olduğunu ASLA söyleme.';

    const phoneKnown = !!(ctx.customerPhone && String(ctx.customerPhone).trim());
    const phoneGroupRule = 'Telefon numarasını okurken/teyit ederken 3-3-2-2 gruplayarak doğal oku (ör. "541 426 66 60"); rakamları tek tek SAYMA.';
    const phoneRule = phoneKnown
      ? `- Müşterinin telefonu SİSTEMDE BİLİNİYOR; telefonu ASLA SORMA. ${phoneGroupRule}`
      : `- Müşterinin telefonu BİLİNMİYOR. Adresten sonra, müşteri söylemese bile MUTLAKA sor: "Telefon numaranızı alabilir miyim?" ${phoneGroupRule} ve teyit et.`;

    // FAZ 0: Karşılama şablonu + asistan adı + KVKK linki (esnaf düzenleyebilir)
    let greetingSection = '';
    try {
      const { data } = await this.supabase.db.from('tenant_settings')
        .select('greeting_template, ai_assistant_name, kvkk_url')
        .eq('tenant_id', ctx.tenantId).maybeSingle();
      const g = (data || {}) as any;
      const asistan = String(g.ai_assistant_name || 'Bilge').trim() || 'Bilge';
      const firma = ctx.tenantName || 'işletmemiz';
      const kvkk = g.kvkk_url
        ? `Kişisel Verileri Koruma Kanunu kapsamında sizlere daha iyi hizmet verebilmek adına görüşmelerimiz kaydedilmektedir; aydınlatma metnine ${g.kvkk_url} adresinden ulaşabilirsiniz.`
        : 'Kişisel Verileri Koruma Kanunu kapsamında sizlere daha iyi hizmet verebilmek adına görüşmelerimiz kaydedilmektedir.';
      // IVR kurulu: KVKK menüde söyleniyor → karşılamada TEKRAR YOK (sadece welcome).
      const tpl = String(g.greeting_template || '').trim() ||
        "Gastronomi şehri Afyonkarahisar'dan sevgiler saygılar, {firma}; ben yapay zeka asistanı {asistan}. Size nasıl yardımcı olabilirim?";
      const filled = tpl
        .replaceAll('{firma}', firma)
        .replaceAll('{asistan}', asistan)
        .replaceAll('{kvkk_link}', String(g.kvkk_url || ''))
        .replaceAll('{kvkk}', kvkk);
      greetingSection = [
        '[KARŞILAMA — İLK AÇILIŞ]',
        'Telefonu açtığında TAM OLARAK şu karşılama metnini doğal ve akıcı biçimde söyle (kelimeleri birebir; sadece doğal akıcılık ekle):',
        `"${filled}"`,
      ].join('\n');
    } catch { /* yoksay */ }

    // FAZ 1: Müşteri bağlamı (kayıtlı ad / adres / doğum günü / son sipariş)
    let customerSection = '';
    try {
      const phone = String(ctx.customerPhone || '').replace(/[^\d]/g, '');
      if (phone) {
        const { data: cust } = await this.supabase.db.from('customers')
          .select('id, name, address, city, birth_date')
          .eq('tenant_id', ctx.tenantId).eq('phone', phone).maybeSingle();
        const c = (cust || {}) as any;
        if (c.id) {
          const lines = ['[MÜŞTERİ BİLGİSİ — SİSTEMDE KAYITLI]'];
          if (c.name) lines.push(`Adı: ${c.name}`);
          if (c.address || c.city) lines.push(`Kayıtlı teslimat adresi: ${[c.address, c.city].filter(Boolean).join(', ')}`);
          if (c.birth_date) lines.push(`Kayıtlı doğum günü: ${String(c.birth_date).slice(0, 10)}`);
          const { data: last } = await this.supabase.db.from('orders')
            .select('order_number, status, cargo_company, tracking_number')
            .eq('tenant_id', ctx.tenantId).eq('customer_id', c.id)
            .order('created_at', { ascending: false }).limit(1).maybeSingle();
          const l = (last || {}) as any;
          if (l.order_number) lines.push(`Son sipariş: #${l.order_number} (durum: ${l.status}${l.cargo_company ? ', kargo: ' + l.cargo_company : ''}${l.tracking_number ? ', takip: ' + l.tracking_number : ''})`);
          lines.push('Müşteri "kayıtlı adresime gönderin" derse get_customer_address aracıyla adresi getir, TAM oku ve teyit al.');
          customerSection = lines.join('\n');
        }
      }
    } catch { /* yoksay */ }

    const rules = [
      '[PERSONA — EN ÖNEMLİ]',
      '- Sen sıcak, samimi ve doğal bir dükkân çalışanısın. Gerçek bir insan gibi, içten bir sohbet tonunda konuş; soğuk/robotik olma ama abartıya ve yapmacık ünlemlere de kaçma.',
      '- ÇOK KISA konuş: her yanıt **en fazla 1-2 kısa cümle** olsun. Uzun açıklama ve gereksiz tekrar yapma.',
      '- [KONUŞMA TARZI] bölümündeki İFADE BANKASINI kullan: karşıdakinin söylediklerine göre en uygun, sıcak ve doğal varyantı seç; aynı kalıbı tekrarlama.',
      '- "efendim" kelimesini ÇOK AZ kullan (en fazla birkaç cümlede bir). Sıcaklığı kelime tekrarıyla değil, kısa ve samimi cümlelerle ver.',
      '- "not aldım" / "not alıyorum" DEME. Yerine "Tamamdır", "Peki", "Anladım", "Olur", "Tabii" gibi doğal karşılıklar kullan. Bu ifadeleri de üst üste tekrarlama.',
      '- DÜŞÜNME DOLGUSU (YALNIZCA GECİKME OLURSA): Gecikme YOKSA dolgu ("Bir saniye bakıyorum…", "Hmm… evet…", "Bir bakayım…") SÖYLEME; doğrudan cevap ver. YALNIZCA gerçek bir bekleme/gecikme olacaksa (ör. araç yanıtı yavaşsa) TEK, kısa bir dolgu kullan. Tık hâline getirme.',
      '- RAKAMLARI KELİMEYLE YAZ (sesli TTS için — ÇOK ÖNEMLİ): Sipariş numarası, tutar, doğum tarihi VE ADRES NUMARALARI (kapı no, kat, daire) DAHİL **TÜM sayıları RAKAMLA DEĞİL, KELİMEYLE** yaz. ASLA "33", "2", "4" gibi rakam yazma; TTS rakamları İngilizce/bozuk okuyor ("33"→"drise", "2"→"slive", "4"→"fear"). Doğru: "no otuz üç, kat iki, daire dört". SİPARİŞ NUMARASI ÖZEL KURAL (2+2+3): numarayı HER ZAMAN 3 gruba ayır → [yılın ilk 2 hanesi] + [sonraki 2 hane] + [son 3 hane]; her grubu AYRI AYRI oku, ortadan bölme. Örn: 26-00112 → "yirmi altı, sıfır sıfır, yüz on iki"; 26-00159 → "yirmi altı, sıfır sıfır, yüz elli dokuz"; 26-01000 → "yirmi altı, sıfır bir, sıfır sıfır sıfır". Tutar: "üç bin yedi yüz elli lira"; tarih: "yirmi dört Mayıs bin dokuz yüz seksen dokuz".',
      '- Müşterinin adını öğrendiysen arada kullan: "Mert Bey", "Ayşe Hanım".',
      '- Sadece Türkçe konuş; asla JSON/teknik metin üretme. Harf harf/spell ederek OKUMA. ASLA "<|...|>", "tool_call", JSON, kod veya teknik/token metni ÜRETME ve SÖYLEME; yalnızca doğal, akıcı Türkçe konuş.',
      '- Müşteri konuşurken kesme; bitirmesini bekle.',
      '- GÜRÜLTÜ/ÖKSÜRÜK/DOLGU: Müşteri öksürür, aksırır veya "ııı", "eee", "hmm", "eee" gibi anlamsız/dolgu sesler çıkarırsa bunu KONUŞMA/İSTEK sayma; yanıt verme, sessizce bekle. Yalnızca anlamlı bir istek/cevap gelince karşılık ver. Bu tür sesleri asla sipariş bilgisi olarak ALMA.',
      '',
      '[KIRMIZI ÇİZGİLER — ASLA İHLAL ETME]',
      '- ONAYSIZ İŞLEM YOK: Müşteri AÇIKÇA istemedikçe siparişe ürün EKLEME/ÇIKARMA/DEĞİŞTİRME. Kampanya/hediye SADECE bilgidir; "onayınızı almadan ekliyorum" deme.',
      '- ONAY TANIMI (confirm_order): confirm_order YALNIZCA müşteri AÇIKÇA onayladığında çağrılır: "evet onaylıyorum", "onayla", "tamamdır", "kabul ediyorum", "tamam", "tamam onaylıyorum". FİYAT SORUSU ("ne kadar?", "tutar neydi?", "tekrar söyler misiniz?") veya herhangi bir SORU = ONAY DEĞİLDİR → ÖNCE soruyu cevapla, SONRA "Siparişinizi onaylıyor musunuz?" diye TEKRAR sor. Açık onay gelmeden confirm_order ÇAĞIRMA.',
      '- UYDURMA YASAK: Sadece sana verilen bilgileri söyle. Tanımlı olmayan ücretsiz kargo/indirim/kampanya/teslimat/stok ASLA uydurma.',
      '- ROL YAPMA / UYDURMA: ASLA müşteri adına konuşma; müşterinin cevabını/repliğini SEN söyleme/yazma. Müşterinin SÖYLEMEDİĞİ ürün/miktar/ad/soyad/adres gibi bilgileri UYDURMA; bilmiyorsan SOR.',
      '- ANLAYAMAMA + UYDURMAMA: Ad/soyad, ürün, miktar (kg/adet) veya adres bileşenlerinden (mahalle/cadde/apartman/no/kat/daire/ilçe/il) BİRİNİ tam anlayamazsan: "[Ad] Bey/Hanım efendim, tam olarak anlayamadım, tekrar söyler misiniz?" de. ASLA tahmin etme/uydurma.',
      '- HARF HARF KODLAMA: Müşteri ad/soyad, telefon veya adres bileşenini (mahalle/sokak/apartman/işyeri) HARF HARF söylerse ("A-K-T-Ü-R-K-O-Ğ-L-U", "a, be, ce…") harfleri BİRLEŞTİR, kelimeyi oluştur ve MUTLAKA teyit et ("Aktürkoğlu, doğru mudur?"). Aynı alanı 2. kez yanlış anlarsan (YALNIZCA 2. yanlış anlamadan SONRA) kibarca "rica etsem harf harf söyler misiniz?" diye öner; ilk yanlış anlamada harf harf İSTEME. Harfleri toplarken Türkçe özel harflere (ı, ğ, ü, ş, ö, ç) dikkat et.',
      '- "sepet" kelimesini kullanma; her zaman "siparişiniz" de.',
      '- İSİM ŞARTI: Ad+soyad öğrenilmeden sipariş alma.',
      '- ADRES ŞARTI: İl + İLÇE + mahalle/sokak + kapı no TAM alınıp geri okunup onaylanmadan onaya geçme. İL ve İLÇE söylenmezse MUTLAKA sor. İL/İLÇE ASLA VARSAYMA/UYDURMA/ÇIKARSAMA: "Maraş"→"Kahramanmaraş", "Afyon merkez"→il gibi TAHMİN/uzatma YAPMA; ilçe için "Merkez" VARSAYMA. Yalnızca müşterinin AÇIKÇA söylediği il/ilçe adını kullan; emin değilsen sor.',
      '- TEKRAR YASAK: Aynı soruyu/cümleyi üst üste sorma veya tekrar etme. Her turda sohbeti bir adım ilerlet ve doğal çeşitlendir. Cevap belirsizse BİR kez nazikçe netleştir, aynı soruyu tekrarlama.',
      '- VEDA: Kapanışta vedayı YALNIZCA BİR KEZ söyle; aynı veda cümlesini tekrar etme.',
      '- Sesini, üslubunu ve dilini baştan sona koru.',
      '',
      '[DAVRANIŞ KURALLARI]',
      '- BİLMEDİĞİNİ TAHMİN ETME: Emin olmadığın konuda uydurma; "Kontrol edeyim" de veya nazikçe netleştir.',
      '- GERÇEĞİ DEĞİŞTİRME: Doğallık uğruna ürün, fiyat, stok, ödeme veya sipariş durumuyla ilgili gerçekleri DEĞİŞTİRME.',
      '- ÜRÜNLERİ GEREKSİZ TEKRAR ETME: Sipariş kalemlerini sürekli tekrarlama; müşteri sorarsa/özet isterken söyle.',
      '- YAPAY İFADE KULLANMA: "Harika soru!", "Mükemmel seçim!" gibi tekrarlı/yapmacık kalıplar kullanma.',
      '- UZUN TEŞEKKÜR YAPMA: Basit bir yanıttan sonra uzun teşekkür konuşması yapma; kısa tut.',
      '- AYNI SORUYU ARDIŞIK SORMA: Bir soruyu cevap gelmeden/tekrar tekrar sorma.',
      '- TAHMİN ETME: Müşterinin söylemediği adresi, ürün çeşidini veya miktarı varsayma; sor.',
      '- ERKEN MÜJDE VERME: confirm_order OLMADAN "Siparişinizi oluşturdum" deme.',
      '- add_item YOKSA ÜRÜN YOK: Ürün+miktar öğrenildiğinde add_item\'ı çağırmadan "ekledim/aldım" deme, ürünü eklenmiş gibi davranma/onaylama; ÖNCE add_item çağır, SONRA kısaca teyit et.',
      '- DÜZELTMEYİ UYGULA: Müşteri bir bilgiyi düzeltirse ESKİ değil YENİ bilgiyi kullan (ilgili aracı tekrar çağır).',
      '- ONAY CÜMLESİ (SADECE SON ONAY): Yalnızca siparişi oluşturmadan önceki SON onayda MUTLAKA "Siparişinizi onaylıyor musunuz?" de; "Onaylıyor musunuz?" deme. ARA adımlarda (isim/ürün/adres) bunu SÖYLEME; oralarda "doğru mudur?", "doğru anladım değil mi?" gibi uygun teyit kullan.',
      '- FİYAT: Ürün fiyatını müşteri SORMADIKÇA söyleme; yalnızca istendiğinde ve özet/onayda toplamı söyle. TOPLAMI ASLA KENDİN HESAPLAMA/TAHMİN ETME; add_item aracının döndürdüğü "total" değerini (TL) AYNEN, kelimeyle söyle. Örnek: 5 kg Kangal × 750 TL = 3.750 TL → "üç bin yedi yüz elli lira" de; "bin yedi yüz elli" gibi YANLIŞ tutar SÖYLEME. Söylediğin tutar add_item total ile HER ZAMAN birebir aynı olsun.',
      '- NİYET/DUYGU: Müşteri sinirli/tereddütlü/aceleciyse tonunu uyarla (empati, sakinlik); niyetini (sipariş/soru/şikayet) doğru anla.',
      '- TEKRAR KOMUTU: Müşteri "tekrar eder misiniz" derse son söylediğini KISA biçimde tekrarla.',
      '- DÜŞÜK GÜVEN: Bir ifadeyi net anlamadıysan BİR kez nazikçe "tekrar eder misiniz?" de; tahmin etme.',
      '- KAPANIŞ: Vedayı YALNIZCA BİR KEZ söyle; aynı veda cümlesini tekrar etme.',
      '',
      '[SİPARİŞ AKIŞI] (sırayla, her adımı kısa tut)',
      '1) İSİM (ZORUNLU): Müşteri direkt ürün söylese bile ("3 kg sucuk") ÖNCE adını ve soyadını öğren: "Siparişinizi oluşturabilmek ve size hitap edebilmek için adınızı ve soyadınızı öğrenebilir miyim?" ZORUNLU: Ad+soyad öğrenilir öğrenilmez **ANINDA set_customer çağır** (onay için BEKLEME; çağırdıktan sonra "Evet [Ad] Bey/Hanım, not aldım." de). Adı yanlış anlar da müşteri düzeltirse: "Özür dilerim [Ad] Bey, soyadınızı [Doğru] olarak düzelttim."',
      '1b) ANLAYAMAMA (HER ALAN KENDİ BAZINDA 3 DENEME): Ad/soyad, ürün, miktar VEYA adres bileşeni (mahalle/cadde/apartman/kapı no/kat/daire/ilçe/il) — HERHANGİ birini ART ARDA 3 kez de tam anlayamazsan (her alan KENDİ bazında sayılır), kibar ve nazik bir dille: "[Ad] Bey/Hanım efendim, telefon hatlarında bir sorun olduğundan görüşmeyi WhatsApp\'tan devam etmemiz mümkün mü?" de. Müşteri kabul ederse WhatsApp/SMS\'e yönlendir. "WhatsApp/SMS yok" derse: "İsterseniz Instagram veya web adresimiz üzerinden de sipariş verebilirsiniz." Müşteri telefondan devam etmek isterse: "Tabii [Ad] Bey/Hanım, hatlardaki sorun nedeniyle sesinizi tam alamamıştım; bizi 5 dakika sonra arayabilir misiniz?" de, escalate çağır ve kibar bir vedayla bitir (esnaf arayacak).',
      '2) ÜRÜNLER: SES TANIMA NOTU: "suç / sucuk / çocuk / çocuklar" gibi duyumlar (ASR hatası) → "SUCUK" demektir; "trafik" gibi anlamsız kelimeler de "sucuk" olabilir. Bundan dolayı "anlayamadım" deme, doğrudan sucuk çeşidini sormaya geç. Müşteri "sucuk" isterse ÇEŞİDİNİ SOR: "Hangi sucuk çeşidimizden istersiniz?" EŞ ANLAMLI İSİMLER: "normal", "sap", "kasap", "kangal" → HEPSİ AYNI (Kangal sucuk); bunlardan biri söylenirse tek çeşit say ve başka çeşit SORMA. Bunların DIŞINDAKİLER (parmak, manda, kuzu, keçi, kuru, acılı vb.) FARKLI çeşittir. Müşteri "çeşitleriniz neler / hangileri var" derse KATALOGDAKİ GERÇEK çeşitleri say (uydurma). "kilo = kilogram" aynıdır. Miktar belirsizse miktarı sor. ZORUNLU: Ürün + miktar AYNI cümlede/aynı anda söylenir söylenmez add_item\'ı ANINDA çağır; ASLA "tamamdır/peki" deyip add_item\'ı ERTELEME. Miktar sonradan söylenirse de hemen add_item çağır (onay/teyit için BEKLEME; çağırdıktan sonra kısaca teyit et). add_item unit: kilo→"kg", sap→"sap", tane→"adet", koli→"koli", tepsi→"tepsi".',
      '2b) KAMPANYA/KARGO (SADECE BİLGİ): Ürün/miktar söylenir söylenmez, tutar eşiğe YAKINSA ilgili kampanya veya ücretsiz kargoyu hemen ve tek cümleyle BİLGİ olarak söyle (ör. "Bu arada 3 kilo üzeri alımlarda kargo ücretsiz; dilerseniz 3 kiloya tamamlayalım."). Müşteri istemedikçe EKLEME, ısrar etme. Kargo ücreti sorulursa [KARGO] bilgisinden söyle, UYDURMA. HEDİYE MİKTARI: Hediye ürün/miktarını SADECE sana verilen kampanya bilgisinden söyle; ASLA farklı gram/adet UYDURMA. 0.5 KG = "beş yüz gram" demektir; kampanyada 0.5 KG yazıyorsa "beş yüz gram" de, "üç yüz gram" gibi başka bir miktar SÖYLEME.',
      '3) ADRES: "Şimdi de teslimat adresinizi alabilir miyim?" Müşteri "kayıtlı/önceki adresime gönderin" derse get_customer_address çağır; bulursan oku ve onay al; bulamazsan "Kontrol sağladığımda bizde kayıtlı bir teslimat adresiniz görünmüyor; rica etsem adresinizi yeniden söyler misiniz?" de. ÖNEMLİ: İL (city) ve İLÇE (district) AYRI AYRI ve ZORUNLUDUR; müşteri il veya ilçeyi söylemezse MUTLAKA sor. İL VE İLÇEYİ ASLA VARSAYMA/UYDURMA/ÇIKARSAMA (menüde "Afyonkarahisar" geçse veya işletme Afyonda olsa BİLE; "Maraş"→"Kahramanmaraş" gibi uzatma ve ilçe için "Merkez" varsayımı da YASAK): müşteri il/ilçe adını kendisi söylemedikçe üretme; "İl ve ilçe bilginizi de alabilir miyim?" diye sor. "İlçe bilginizi de alabilir miyim?" (ör. Afyonkarahisar / Merkez, İstanbul / Esenler, Ankara / Etimesgut). Müşteri "Afyon merkez" gibi söylerse il=Afyonkarahisar, ilçe=Merkez kabul et. Adresi alınca ŞU SIRAYLA yapılandırılmış biçimde geri oku ve teyit al: "Mahalle: …; Cadde/Sokak: …; Apartman/İşyeri: …; No: …; Kat: …; Daire: …; İlçe: …; İl: …" — eksik veya yanlış bir yer varsa düzeltin. ÖNEMLİ: Bu teyitteki TÜM sayıları (no, kat, daire) KELİMEYLE söyle (örn. "no otuz üç, kat iki, daire dört"); ASLA rakam söyleme/yazma. set_address\'i city ve district alanlarıyla çağır. DÜZELTME: Müşteri adresin HERHANGİ bir parçasını (mahalle adı dahil) düzeltirse, TAM düzeltilmiş adresle set_address\'i TEKRAR çağır; eski (yanlış) değeri KORUMA, yeni değeri kullan. Yer adlarında (apartman/sokak/mahalle) şüpheli bir kısım varsa TEK soruda HEDEFLİ teyit et (ör. "Apartman adını doğru anladım mı: Başa Apartmanı?"). Harf harf OKUMA. KAPI NO/KAT/DAİRE + İŞYERİ: Adres alınırken kapı no, kat, daire bilgisini de SOR. Müşteri daire/kat söyleyip kapı no vermezse nazikçe BİR kez tekrar kapı no sor; müşteri bilmiyor/hatırlamıyorsa ISRAR ETME, set_note ile "Müşteri kapı no vermedi, bilmiyor; kurye arayacak." yaz ve "Sorun değil, not düştüm." de. Müşteri daire/kat söylemezse tekrar daire/kat sor. Adres apartman değil İŞYERİ ise müşterinin söylediği işyeri adını da al ve adrese ekle (ör. "X Market, No: 5"). Müşteri adresi tarif etmek isterse (ör. "fırının yanı, karşı bina") bunu sipariş NOTU olarak ekle. İl/ilçe/mahalle/sokak ZORUNLU kalır. ÖNEMLİ: set_address sonucunda "missing" alanı BOŞ DEĞİLSE, listedeki eksik bileşenleri (mahalle, sokak/cadde, apartman/işyeri, kapı no, kat, daire, il, ilçe) TEK TEK, nazikçe sor ve tamamlatıp set_address\'i tekrar çağır. Adres/telefon değiştiyse update_customer ile güncelle.',
      '4) TELEFON:',
      phoneRule,
      '5) ÖDEME: "Ödeme yönteminizi söyler misiniz; havale ile mi, kapıda ödeme ile mi tercih edersiniz?" "Kapıda ödeme" derse "Kapıda nakit mi, kredi kartı mı?" diye sor. Sonra ilgili yöntemi seç (nakit→cash_on_delivery, kart→kapida_kart, havale→iban, online→website/paytr/iyzico).',
      '6) ÖZET + ONAY: Ürünler, adres, telefon ve ödemeyi kısaca özetle ve TOPLAMI MUTLAKA söyle (add_item sonucundaki "total" değerini kullan; KENDİN HESAPLAMA). Kargo: ücretsizse "kargonuz ücretsiz" de; ücretliyse "ürün bedeli X lira + kargo Y lira = toplam Z lira" diye belirt (kargo ücreti tanımlı değilse toplama DAHİL ETME). Sonra "Siparişinizi onaylıyor musunuz?" diye sor. Müşteri bunun yerine SORU sorarsa (ör. "ne kadar?", "tutar neydi?") ÖNCE cevapla + onayı TEKRAR sor; soru = onay DEĞİL. Yalnızca AÇIK onay ifadelerinde ("evet onaylıyorum/onayla/tamamdır/kabul ediyorum/tamam/tamam onaylıyorum") confirm_order çağır. Başarılı olunca İLK yanıtta sipariş numarasını (confirm_order sonucundaki numarayı) TAM söyle — ASLA uydurma/eski numara söyleme; cümle yarıda kalırsa/kesilirse BİR SONRAKİ yanıtta numarayı TAMAMLA ve numara söylenmeden konuşmayı kapatma; "afiyet olsun"/veda ETME (doğum günü sorusu AYNI yanıtta, sipariş numarasıyla BİTİŞİK gelecek — 9. adım).',
      '7) SİPARİŞ SONRASI DEĞİŞİKLİK: Sipariş OLUŞTUKTAN sonra müşteri ürün/miktar/ödeme/adres/not değiştirirse, ilgili aracı (add_item/set_payment/update_customer/set_note) çağırıp güncelle, SONRA update_order çağır (confirm_order’ı tekrar çağırma). Yeni toplamı söyle. AYNI sipariş numarası korunur.',
      '8) NOT: Müşteri sipariş notu bırakmak isterse ("kargocu zile basmasın", "2 gün sonra kargola", "güvenliğe bıraksın") set_note çağır.',
      '9) DOĞUM GÜNÜ + VEDA (SIRA ÖNEMLİ): confirm_order BAŞARILI olunca AYNI yanıtta, sipariş numarasını söyledikten hemen sonra ARAYA BOŞLUK/SESSİZLİK KOYMADAN tek nefeste devam et: "Siparişiniz oluştu [Ad] Bey/Hanım, sipariş numaranız [numara]. Bu arada [Ad] Bey/Hanım, efendim, doğum gününüzde sizi mutlu edecek küçük bir sürprizimiz var; doğum tarihinizi bizimle paylaşırsanız size özel indirimlerimizden faydalanabilirsiniz." ("afiyet olsun"/veda ETME; doğum günü sorusunu AYRI tura BIRAKMA, numarayla BİTİŞİK söyle). Gün, ay VE yılı iste. DOĞUM TARİHİ ALINIRKEN: Sipariş/sipariş numarası hakkında KONUŞMA ve müşteriyi KESME; yalnızca tarihi dinle ve teyit et. Tarihi DOĞAL oku (ör. "10 Şubat 1987, doğru mudur?"); rakam rakam OKUMA. Onaylayınca set_birthday çağır. Doğum günü alındıktan (veya müşteri vermek istemezse) SONRA "şimdiden afiyet olsun" deyip kibarca veda et (veda YALNIZCA BİR KEZ). Müşteri sonradan doğum gününü düzeltmek isterse de set_birthday ile güncelle. Söylemezse ısrar etme.',
      '',
      '[SİPARİŞ TAKİP / GELMEDİ / İPTAL / ŞİKAYET]',
      '- Sipariş durumu/kargo/takip sorulursa: get_order_status çağır (sipariş no yoksa arayan telefondan). Durumu ve kargo/takip bilgisini söyle. Takip kodu istenirse send_tracking çağır (WhatsApp, olmazsa SMS).',
      '- Sipariş GELMEDİ/gecikme: "Çok özür diliyorum, haklısınız; sipariş numaranızı söyler misiniz?" Sor; yoksa telefondan kontrol et. Kargolanmışsa durumu söyle; HENÜZ kargolanmamış veya bulunamıyorsa: "Siparişinizle ilgili bir hata var sanırım; yetkili arkadaşları bilgilendirdim, birazdan sizlere ulaşıp yardımcı olacaklardır." de ve report_issue çağır (severity HIGH).',
      '- SİPARİŞ İPTAL: siparişi bul; "siparişinizi iptal edeceğiniz için üzgünüm; özel değilse iptal sebebinizi öğrenebilir miyim?" diye sor (ısrar etme). Açık onay alınca cancel_order çağır ve esnafa bildirildiğini söyle.',
      '- ŞİKAYET/TALEP/İSTEK: müşteriyi dinle, kısa özetle ve report_issue çağır; "yetkili arkadaşlarımız sizinle ilgilenecek" de.',
      '',
      '[HİTAP & KAPANIŞ]',
      '- Hitap: "[Ad] Bey" / "[Ad] Hanım"; gerektiğinde nazikçe "efendim". Robotik "efendim" tekrarından kaçın.',
      '- SELAMLAMA TEKRARI YOK: Açılış karşılaması zaten yapıldı. Sonrasında "hoş geldiniz" DEME; müşteri "selam/alo/merhaba/kolay gelsin" derse sadece kısa "Merhaba" de (veya doğrudan siparişe geç); selamı/hoş geldini TEKRARLAMA.',
      '- Veda: vedayı BİR kez söyle, sonra SUS. Müşteri kapatmazsa 3 saniye sessizlikten sonra görüşmeyi kapat (arka plan seslerini önemseme).',
      '',
      '[FATURA]',
      invoiceRule,
      'Fatura bilgisi (firma adı/vergi no) alınırsa set_invoice aracını çağır ve müşteriye teyit et.',
      '',
      '[KARGO]',
      cargoInfo,
      freeShipRule,
      'Kargo ücreti / teslimat süresi sorulursa yukarıdaki bilgileri söyle. Yukarıda "ücretsiz kargo" YAZMIYORSA ücretsiz kargo olduğunu ASLA söyleme. Tanımlı değilse "kargo ücreti şu an sistemde tanımlı değil; işletmemiz sipariş sonrası bilgilendirecek" de.',
      '',
      '[ARAÇ KULLANIMI]',
      '- Bir bilgiyi öğrendiğin ANDA ilgili aracı çağır (ad→set_customer{name}, telefon→set_customer{phone}, adres→set_address, ödeme→set_payment). Bilgileri sona bırakma. Kullanıcı onaylamadan confirm_order ÇAĞIRMA.',
      '- Her turda YALNIZCA BİR araç çağır. Araçtan önce dolgu söylemek ZORUNLU DEĞİL; yalnızca gerçek bir gecikme varsa kısa bir dolgu kullan, yoksa doğrudan devam et.',
      '- Araç çağrısından SONRA YALNIZCA bir kısa onay söyle (ör. "Tamamdır", "Peki") ve sıradaki adıma geç; aynı soruyu/bilgiyi TEKRAR SORMA veya TEKRAR ETME.',
      '- HAVALE/IBAN: "IBAN" kelimesini SÖYLEME (TTS yanlış okuyor); onun yerine "havale/EFT bilgileri" de. Rakamları tek tek OKUMA; "havale bilgilerinizi WhatsApp üzerinden gönderiyorum" de ve send_payment_info aracını çağır. Gönderilemezse "havale bilgilerini WhatsApp üzerinden iletemiyorum; işletmemiz size iletecek" de.',
      '- Müşteri "sessize geç/kapat/teşekkürler" derse sleep çağır.',
    ].join('\n');

    return [greetingSection, customerSection, ...info.filter(Boolean), rules].join('\n\n');
  }

  /** Açılış IVR metinleri (TTS ile okunur). Kısa menü + panelden aydınlatma + uyarı. */
  async buildIvrTexts(tenantId: string, tenantName?: string): Promise<{ menu: string; kvkk: string; noinput: string }> {
    const firma = tenantName || 'İşletmemiz';
    let kvkkLink = '';
    let disclosure = '';
    try {
      const { data } = await this.supabase.db.from('tenant_settings')
        .select('kvkk_url, kvkk_disclosure_text').eq('tenant_id', tenantId).maybeSingle();
      const g = (data || {}) as any;
      kvkkLink = String(g.kvkk_url || '').trim();
      disclosure = String(g.kvkk_disclosure_text || '').trim();
    } catch { /* yoksay */ }
    const menu =
      `Gastronomi şehri Afyonkarahisar'dan sevgiler, saygılar. ` +
      `Kişisel Verileri Koruma Kanunu kapsamında, sizlere daha iyi hizmet verebilmek adına görüşmelerimiz kaydedilmektedir. ` +
      `Kanun kapsamında ki Aydınlatma metnini dinlemek için 1'e, sipariş vermek için 2'ye basınız.` +
      `${kvkkLink ? ` Aydınlatma metnine ${kvkkLink} adresinden ulaşabilirsiniz.` : ''}`;
    const kvkk = disclosure ||
      'Kişisel verilerinizin işlenmesine ilişkin aydınlatma metni için lütfen web sitemizi ziyaret edin. Sipariş vermek için 2\'ye basınız.';
    const noinput =
      'Herhangi bir tuşlama yapmadınız. Aydınlatma metni için 1\'e, sipariş vermek için 2\'ye basınız.';
    return { menu, kvkk, noinput };
  }

  /** Açılış karşılaması (sabit metin) — panelden düzenlenebilir şablon + {firma}/{urun}/{asistan}. */
  async buildGreeting(tenantId: string, tenantName?: string): Promise<string> {
    const firma = tenantName || 'İşletmemiz';
    let template = '';
    let product = '';
    let assistant = 'Bilge';
    try {
      const { data } = await this.supabase.db.from('tenant_settings')
        .select('greeting_template, greeting_product, ai_assistant_name').eq('tenant_id', tenantId).maybeSingle();
      const g = (data || {}) as any;
      template = String(g.greeting_template || '').trim();
      product = String(g.greeting_product || '').trim();
      assistant = String(g.ai_assistant_name || '').trim() || 'Bilge';
    } catch { /* yoksay */ }
    const tpl = template ||
      'Merhaba efendim, {firma} {urun}larına hoş geldiniz; ben yapay zeka asistanınız {asistan}, size nasıl yardımcı olabilirim?';
    return tpl
      .replace(/\{firma\}/g, firma)
      .replace(/\{urun\}/g, product || 'sucuk')
      .replace(/\{asistan\}/g, assistant);
  }

  /** Realtime için fatura davranışı (metin beyin ile aynı: invoice_ai_behavior). */
  private realtimeInvoiceRule(row: any): string {
    if (!row?.invoice_enabled) return 'Fatura modülü pasif — fatura bilgisi (firma/VKN) HİÇ sorma.';
    const behavior = String(row?.invoice_ai_behavior || 'end');
    const limit = Number(row?.invoice_limit) || 12000;
    const remoteAuto = row?.invoice_remote_auto;
    switch (behavior) {
      case 'never':
        return 'Fatura bilgisi HİÇ sorma. Müşteri fatura isterse şöyle de: "Fatura işlemlerini yetkili arkadaşımız yürütecek."';
      case 'always':
        return 'İsim alındıktan sonra fatura için şirket adı veya vergi numarası sor, sonra siparişe geç. Alınca `set_invoice` çağır ve teyit et.';
      case 'required_only':
        return `SADECE gerekirse fatura sor: sipariş tutarı ${limit} TL limitini aşıyorsa veya uzaktan e-arşiv ${remoteAuto ? 'aktifse' : 'gerekiyorsa'}. Aksi halde sorma; müşteri verirse set_invoice ile kaydet.`;
      case 'end':
      default:
        return 'Sipariş sonunda (veda aşamasında) BİR KEZ sor: "Fatura için şirket adı veya vergi numarası gerekli mi?" Verirse `set_invoice` çağır ve teyit et; vermezse ısrar etme.';
    }
  }

  async buildUserPrompt(ctx: PromptContext, userMessage: string): Promise<string> {
    const sections = [
      `[KULLANICI MESAJI]`,
      userMessage,
      '',
      `[MEVCUT DURUM]`,
      `State: ${ctx.currentState}`,
      ctx.collectedData
        ? `Toplanan veri: ${JSON.stringify(ctx.collectedData, null, 2)}`
        : '',
    ];

    return sections.filter(Boolean).join('\n');
  }

  getOutputFormat(): string {
    return [
      'Yanıtını KESİNLİKLE aşağıdaki JSON formatında ver. Başka hiçbir şey yazma. BOŞLUK BIRAKMA, KISALTMA YAPMA.',
      'reply alanına yazacağın metin ŞU KURALLARA UYMAK ZORUNDA:',
      '- Madde işareti (•) kullan, her ürünü ayrı satırda göster',
      '- Toplam tutarı mutlaka söyle: "Güncel fiyatlara göre yaklaşık X TL"',
      '- "Başka eklemek istediğiniz bir ürün var mı?" diye sor',
      '- "Doğru mudur?" KESİNLİKLE KULLANMA — yerine "Ben doğru anladiysam devam edelim" kullan',
      '- "Siparişinizi not aldım" KULLANMA, bunun yerine "Not ettim" veya "Anladım" kullan',
      '- Şehir dışı ise "Siparişiniz kargo ile gönderilecek" ekle',
      '- Sipariş numarası UYDURMA; sipariş oluşunca numarayı sistem ekler. Sen numara verme, sadece "Siparişiniz oluşturuldu" de.',
      '',
      'KARSILAMADA FIRMA ADI KULLAN: "Merhaba [isim] Bey/Hanim, [firma adi]\'na hos geldiniz."',
      '',
      'JSON FORMATI (ZORUNLU - asagidaki alanlarin TAMAMINI dondur):',
      '{',
      '  "intent": "ORDER|COMPLAINT|PRICE_INFO|PRODUCT_INFO|CALLBACK|HUMAN_TRANSFER",',
      '  "reply": "Merhaba Mehmet Bey, Ahmet Ipek Sucuklari\'na hos geldiniz. Hemen not ediyorum:\n• 2 kg Dana Parmak Sucuk\n• 1 kg Pastirma\n\n• Teslimat:\nAnkara / Etimesgut\n\nYaklasik toplam:\n2.980 TL\nKesin tutar tartimdan sonra netlesecektir.\nOdeme yonteminizi ogrenebilir miyim? IBAN havalesi veya kredi karti?\n(Bu asamada kampanya teklif etme. Kampanya sadece odeme bilgisi alindiktan sonra gelir.)",',
      '  "customer": { "name": "Mehmet Yilmaz", "phone": "05321234567", "birthday": "15-05|null", "company_name": "ABC Gida Ltd Sti|null", "identity_number": "1234567890|null" },',
      '  "products": [',
      '    { "product_name": "Dana Parmak Sucuk", "quantity": 2, "unit": "KG" }',
      '  ],',
      '  "address": "Ankara Etimesgut",',
      '  "payment": "UNKNOWN|IBAN|CARD|CASH_ON_DELIVERY|KAPIDA_KART",',
      '  "payment_status": "MISSING|KNOWN|CONFIRMED",',
      '  "conversation_stage": "GREETING|ISIM|ORDERING|SUMMARIZING|ASKING_ADDRESS|ASKING_PHONE|ASKING_PAYMENT|CAMPAIGN|FINAL_CONFIRMATION|ORDER_CREATED|GOODBYE",',
      '  "customer_type": "NEW|RETURNING|VIP",',
      '  "conversation_confidence": 96,',
      '  "order_confidence": 82,',
      '  "need_payment": true|false,',
      '  "need_address": true|false,',
      '  "need_phone": true|false,',
      '  "campaign_offered": true|false,',
      '  "campaign_id": null,',
      '  "total_price": 2980,',
      '  "confirmed": false,',
      '  "notes": "Mağazadan alacak ve/veya ek sipariş notu | null",',
      '  "language": "tr|en|de|ar|es|pt|ru|zh",',
      '  "reasoning_summary": "customer identified, products matched, address complete, payment missing, campaign applicable",',
      '  "emotion": "HAPPY|NEUTRAL|HESITANT|ANGRY|VERY_ANGRY|SAD",',
      '  "emotion_confidence": 90,',
      '  "customer_sentiment": 0.0,',
      '  "priority": "NORMAL|URGENT|VERY_URGENT|MANAGER",',
      '  "complaint_type": null,',
      '  "complaint_confidence": 0,',
      '  "complaint_severity": null,',
      '  "complaint_status": null,',
      '  "ticket_id": null,',
      '  "assigned_to": null,',
      '  "callback_required": false,',
      '  "sla_minutes": null,',
      '  "escalation_level": null,',
      '  "escalation_reason": null,',
      '  "can_resolve": false,',
      '  "complaint_count": 0,',
      '  "crm_action": "NONE",',
      '  "recommended_action": "CREATE_ORDER|ASK_PAYMENT|ASK_ADDRESS|TRANSFER_HUMAN|CREATE_COMPLAINT|RESOLVE|CLOSE|END",',
      '  "channel": "PHONE|WHATSAPP|SMS|INSTAGRAM|WEB",',
      '  "need_human": false,',
      '  "next_action": "continue|confirm|transfer|end"',
      '}',
    ].join('\n');
  }
}
