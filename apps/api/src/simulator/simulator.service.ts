import { Injectable, Logger } from '@nestjs/common';
import { AiBrainService, BrainInput } from '../ai/brain/ai-brain.service';
import { SupabaseService } from '../common/supabase.client';
import { AiProviderFactory } from '../ai/providers/ai-provider.factory';

export interface Persona {
  id: string;
  name: string;
  phone: string;
  channel: 'phone' | 'whatsapp' | 'sms' | 'instagram';
  behaviorPrompt: string;
  goal: string;
  category: string;
}

export interface SimResult {
  personaId: string;
  personaName: string;
  channel: string;
  success: boolean;
  orderCreated: boolean;
  orderNumber?: string;
  turns: number;
  duration: number;
  error?: string;
  transcript: { role: string; content: string }[];
}

export const PERSONAS: Persona[] = [
  { id: 'p01', name: 'Ahmet Uysal', phone: '05321110001', channel: 'whatsapp', category: 'Normal', goal: '2 kg Kangal Sucuk siparişi ver', behaviorPrompt: 'Kibar ve net konuşan bir müşterisin. Siparişini hızlıca ver, adres ve ödeme bilgilerini eksiksiz söyle.' },
  { id: 'p02', name: 'Mehmet Kaya', phone: '05321110002', channel: 'phone', category: 'Normal', goal: '1 kg pastırma sipariş et', behaviorPrompt: 'Aceleci bir müşterisin. Kısa cevaplar ver: evet, hayır, tamam. Detaylara girmeden hızlıca siparişi tamamla.' },
  { id: 'p03', name: 'Zeynep Çelik', phone: '05321110003', channel: 'instagram', category: 'Normal', goal: '500 gr cevizli sucuk al', behaviorPrompt: 'İlk kez sipariş veriyorsun. Ürünler hakkında sorular sor, kargo süresini öğrenmek iste.' },
  { id: 'p04', name: 'Ali Vural', phone: '05321110004', channel: 'sms', category: 'Normal', goal: '3 kg yumurta sipariş et', behaviorPrompt: 'SMS ile sipariş veriyorsun. Kısa ve net mesajlar at.' },
  { id: 'p05', name: 'Fatma Demir', phone: '05321110005', channel: 'whatsapp', category: 'Normal', goal: '2 kg lokum al', behaviorPrompt: 'Nazik ve detaylı bir müşterisin. Ürün çeşitlerini sor, hangi lokumların olduğunu öğren, sonra seçim yap.' },
  { id: 'p06', name: 'Can Yıldız', phone: '05321110006', channel: 'phone', category: 'Toptan', goal: '50 kg sucuk için toptan fiyat iste', behaviorPrompt: 'Toptancısın. Büyük miktar alacaksın, özel fiyat ve indirim bekliyorsun. Tedarik süresini de sor.' },
  { id: 'p07', name: 'Emine Şahin', phone: '05321110007', channel: 'whatsapp', category: 'Pazarlık', goal: '3 kg sucuk al ama indirim iste', behaviorPrompt: 'Her üründe indirim istiyorsun. "3 alana 1 bedava var mı?" gibi sorular sor. Pazarlık yapmaktan çekinme.' },
  { id: 'p08', name: 'Hasan Öztürk', phone: '05321110008', channel: 'phone', category: 'Pazarlık', goal: '5 kg bükme için pazarlık yap', behaviorPrompt: 'Fiyatı yüksek buluyorsun. Alternatif ürün sor, ucuz seçenekleri öğren. En son orta yolu bul.' },
  { id: 'p09', name: 'Ayşe Korkmaz', phone: '05321110009', channel: 'sms', category: 'Sorunlu', goal: 'Sipariş ver ama adresini söylemeyi unut', behaviorPrompt: 'Dalgın bir müşterisin. Siparişini verirken adresini söylemeyi unut. AI hatırlatana kadar fark etmezsin.' },
  { id: 'p10', name: 'Murat Akın', phone: '05321110010', channel: 'whatsapp', category: 'Sorunlu', goal: 'Önce sucuk, sonra lokum, sonra tekrar sucuk iste', behaviorPrompt: 'Kararsızsın. 2-3 kere fikir değiştir. Önce sucuk iste, sonra vazgeç lokum de, sonra tekrar sucuğa dön.' },
  { id: 'p11', name: 'Sibel Arslan', phone: '05321110011', channel: 'phone', category: 'Öfkeli', goal: 'Geçen siparişin kargosu gecikti, şikayet et', behaviorPrompt: 'Çok öfkelisin. Geçen haftaki siparişin hala ulaşmadı. Bağırarak şikayet et. Yetkiliyle görüşmek iste. AI\'ın özür dilemesini bekle.' },
  { id: 'p12', name: 'Kemal Taş', phone: '05321110012', channel: 'whatsapp', category: 'Aceleci', goal: '2 kg sucuk al, hemen kargolansın', behaviorPrompt: 'Çok acelecisin. "Hemen gönderin", "bugün kargoya verin", "yarın elimde olsun" gibi ifadeler kullan.' },
  { id: 'p13', name: 'Derya Polat', phone: '05321110013', channel: 'instagram', category: 'Kararsız', goal: 'Ürünleri incele, 2-3 kere fikir değiştir', behaviorPrompt: 'Instagram\'dan yazıyorsun. Önce fiyat sor, sonra ürün değiştir, en son karar ver. Emoji kullan.' },
  { id: 'p14', name: 'Osman Yavuz', phone: '05321110014', channel: 'phone', category: 'Edge', goal: 'Yavaş konuşan yaşlı müşteri', behaviorPrompt: 'Yaşlı bir müşterisin. Yavaş ve tekrarlayarak konuşuyorsun. AI\'dan 2-3 kere tekrar etmesini iste. Anlamadığını söyle.' },
  { id: 'p15', name: 'Gül Keskin', phone: '05321110015', channel: 'whatsapp', category: 'Edge', goal: 'Yanlış numaraya yazdığını fark et, sonra sipariş ver', behaviorPrompt: 'Önce yanlış numara sandığını söyle: "Pardon yanlış mı oldu?" Sonra doğru yer olduğunu anlayıp sipariş ver.' },
  { id: 'p16', name: 'Burak Eren', phone: '05321110016', channel: 'sms', category: 'Edge', goal: 'Türkçesi zayıf, karışık mesajlar at', behaviorPrompt: 'Türkçen zayıf. Kelimeleri karıştır, devrik cümleler kur. "Ben almak sucuk 2 kilo" gibi.' },
  { id: 'p17', name: 'Leyla Koç', phone: '05321110017', channel: 'instagram', category: 'Edge', goal: 'Gece 03:00\'te sipariş vermeye çalış', behaviorPrompt: 'Gece geç saatte yazıyorsun. AI\'ın mesai saatleri cevabını test et. Gece sipariş alınıyor mu öğren.' },
  { id: 'p18', name: 'Tarık Bulut', phone: '05321110018', channel: 'phone', category: 'İptal', goal: 'Siparişi tamamlamadan vazgeç', behaviorPrompt: 'Sipariş verirken aniden vazgeç: "Çok pahalıymış, vazgeçtim." AI\'ın tepkisini ölç.' },
  { id: 'p19', name: 'Pınar Aydın', phone: '05321110019', channel: 'whatsapp', category: 'İptal', goal: 'Dolandırıcılık şüphesiyle sorgula', behaviorPrompt: 'Şüphecisin. "Dolandırıcı mısınız?", "Bu site güvenilir mi?", "Başka müşteri yorumu var mı?" gibi sorular sor.' },
  { id: 'p20', name: 'Serkan Öz', phone: '05321110020', channel: 'phone', category: 'Çoklu Ürün', goal: '5 farklı üründen azar azar sipariş et', behaviorPrompt: '5 farklı ürün istiyorsun, her birinden az miktarda. 2 kg sucuk, 1 kg pastırma, 1 kg lokum, 2 kg bükme, 3 kg yumurta.' },
  { id: 'p21', name: 'İpek Tunç', phone: '05321110021', channel: 'whatsapp', category: 'Normal', goal: 'Hediye paketi olarak sipariş ver, not eklet', behaviorPrompt: 'Hediye olarak göndermek istiyorsun. Paketleme ve hediye notu hakkında sorular sor.' },
  { id: 'p22', name: 'Cem Uzun', phone: '05321110022', channel: 'phone', category: 'Pazarlık', goal: '50 kg için "piyasa fiyatından düşük ver" diye ısrar et', behaviorPrompt: 'Agresif pazarlık yapıyorsun. Piyasa fiyatının çok altında teklif veriyorsun: "Toptancıdan 100 TL\'ye alıyorum, siz 80 TL\'ye verin."' },
  { id: 'p23', name: 'Nur Işık', phone: '05321110023', channel: 'instagram', category: 'Sosyal', goal: 'DM\'den fiyat sor, sonra hikaye paylaşımı iste', behaviorPrompt: 'Instagram kullanıcısısın. Fiyat sor, sonra ürün fotoğrafı iste, hikayede paylaşmak istediğini söyle.' },
  { id: 'p24', name: 'Deniz Kara', phone: '05321110024', channel: 'phone', category: 'Edge', goal: 'Telefon görüşmesi sırasında hattın kopması', behaviorPrompt: '2-3 tur sonra "alo sesiniz gelmiyor" de, sonra tekrar ara ve kaldığın yerden devam et.' },
  { id: 'p25', name: 'Ebru Akay', phone: '05321110025', channel: 'whatsapp', category: 'Normal', goal: 'Kapıda ödeme ile 2 kg bükme al', behaviorPrompt: 'Nazik bir müşterisin. Kapıda ödeme istediğini belirt, adresini eksiksiz ver.' },
  { id: 'p26', name: 'Volkan Sezer', phone: '05321110026', channel: 'sms', category: 'Edge', goal: 'Sadece rakamlarla sipariş vermeye çalış', behaviorPrompt: 'SMS\'te sadece sayılarla yaz: "2 kilo sucuk 1 pastirma adres ankara" gibi bağlaçsız, kısa mesajlar at.' },
  { id: 'p27', name: 'Aslı Güneş', phone: '05321110027', channel: 'whatsapp', category: 'Normal', goal: 'İki ayrı adrese teslimat iste', behaviorPrompt: 'İki farklı siparişi iki farklı adrese göndermek istiyorsun. AI\'a bunu açıklamaya çalış.' },
  { id: 'p28', name: 'Rıza Doğan', phone: '05321110028', channel: 'phone', category: 'Öfkeli', goal: 'Yanlış ürün geldi diye şikayet et', behaviorPrompt: 'Çok sinirlisin. Geçen siparişinde yanlış ürün geldi. Bağırarak şikayet ediyorsun, iade istiyorsun.' },
  { id: 'p29', name: 'Merve Solmaz', phone: '05321110029', channel: 'whatsapp', category: 'Normal', goal: 'Sipariş notu olarak dilimleme iste', behaviorPrompt: 'Siparişini verirken özel isteklerin var: sucuklar ince dilimlensin, pastırma çemensiz olsun.' },
  { id: 'p30', name: 'Tolga Han', phone: '05321110030', channel: 'phone', category: 'Toptan', goal: 'Restoran için düzenli sipariş anlaşması iste', behaviorPrompt: 'Restoran sahibisin. Haftalık düzenli sipariş için kurumsal anlaşma istiyorsun. Fiyat teklifi ve sözleşme sor.' },
];

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);

  constructor(
    private readonly brain: AiBrainService,
    private readonly aiFactory: AiProviderFactory,
    private readonly supabase: SupabaseService,
  ) {}

  getPersonas(): Persona[] {
    return PERSONAS;
  }

  async runSingle(
    persona: Persona,
    tenantId: string,
    onMessage?: (role: string, content: string) => void,
  ): Promise<SimResult> {
    const start = Date.now();
    const transcript: { role: string; content: string }[] = [];
    const history: { role: string; content: string }[] = [];
    let orderCreated = false;
    let orderNumber: string | undefined;
    let error: string | undefined;
    const maxTurns = 10;

    // Map channel for DB compatibility (instagram not yet in constraint)
    const dbChannel = persona.channel === 'instagram' ? 'whatsapp' : persona.channel;
    const sessionId = `sim-${persona.id}-${Date.now()}`;

    // Pre-create session to avoid label conflicts
    try {
      await this.supabase.db.from('conversation_sessions').insert({
        id: sessionId,
        tenant_id: tenantId,
        channel: dbChannel,
        channel_source: 'simulator',
        phone: persona.phone,
        messages: [],
        status: 'active',
        session_label: `SIM-${persona.id.toUpperCase()}`,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      this.logger.warn(`Session pre-create failed: ${(e as Error).message}`);
    }

    // Initial message from customer
    const initialMsg = await this.generateCustomerMessage(persona, history, 'START');
    history.push({ role: 'user', content: initialMsg });
    transcript.push({ role: 'customer', content: initialMsg });
    onMessage?.('customer', initialMsg);

    for (let turn = 0; turn < maxTurns; turn++) {
      try {
        // Process through AI Brain — use pre-created session
        const channelForBrain = persona.channel as 'phone' | 'whatsapp' | 'sms' | 'instagram';
        const result = await this.brain.process({
          tenantId,
          channel: channelForBrain,
          phone: persona.phone,
          messages: history.map(m => ({ role: m.role, content: m.content })),
          sessionId,
        });

        const aiReply = result.reply || '';
        history.push({ role: 'assistant', content: aiReply });
        transcript.push({ role: 'assistant', content: aiReply });
        onMessage?.('assistant', aiReply);

        if (result.orderCreated) {
          orderCreated = true;
          orderNumber = result.orderNumber;
          break;
        }

        if (result.needsHuman) {
          transcript.push({ role: 'system', content: 'İnsan müdahalesi gerekli' });
          break;
        }

        if (result.afterHours || result.maintenanceMode) {
          transcript.push({ role: 'system', content: result.afterHours ? 'Mesai saatleri dışında' : 'Bakım modunda' });
          break;
        }

        // Generate next customer message based on AI reply
        const nextMsg = await this.generateCustomerMessage(persona, history, aiReply);
        history.push({ role: 'user', content: nextMsg });
        transcript.push({ role: 'customer', content: nextMsg });
        onMessage?.('customer', nextMsg);
      } catch (e) {
        error = (e as Error).message;
        break;
      }
    }

    const duration = Date.now() - start;

    // Update session with final state
    try {
      await this.supabase.db.from('conversation_sessions').update({
        messages: history,
        status: orderCreated ? 'completed' : 'failed',
        call_status: orderCreated ? 'COMPLETED' : 'FAILED',
        session_data: JSON.stringify({
          simulation: true,
          persona_id: persona.id,
          persona_name: persona.name,
          turns: transcript.length,
          order_created: orderCreated,
          order_number: orderNumber,
        }),
        ended_at: new Date().toISOString(),
      }).eq('id', sessionId);
    } catch (e) {
      this.logger.warn(`Session update failed: ${(e as Error).message}`);
    }

    return {
      personaId: persona.id,
      personaName: persona.name,
      channel: persona.channel,
      success: !error,
      orderCreated,
      orderNumber,
      turns: transcript.length,
      duration,
      error,
      transcript,
    };
  }

  async runAll(
    tenantId: string,
    onProgress?: (result: SimResult) => void,
  ): Promise<SimResult[]> {
    const results: SimResult[] = [];
    for (const persona of PERSONAS) {
      this.logger.log(`Running persona: ${persona.name} (${persona.category})`);
      const result = await this.runSingle(persona, tenantId);
      results.push(result);
      onProgress?.(result);
      this.logger.log(`  ${result.orderCreated ? 'OK' : 'FAIL'} — ${result.turns} turns, ${result.duration}ms`);
    }
    return results;
  }

  private async generateCustomerMessage(
    persona: Persona,
    history: { role: string; content: string }[],
    context: string,
  ): Promise<string> {
    const provider = this.aiFactory.getProvider(undefined);

    const convoHistory = history
      .map(m => `${m.role === 'user' ? 'Müşteri' : 'AI Asistan'}: ${m.content}`)
      .join('\n');

    const prompt = [
      'Sen bir müşteri simülatörüsün. Aşağıdaki persona ile bir AI sipariş asistanıyla konuşuyorsun.',
      '',
      `Persona: ${persona.name}`,
      `Kanal: ${persona.channel}`,
      `Amacın: ${persona.goal}`,
      `Davranış: ${persona.behaviorPrompt}`,
      '',
      context === 'START' ? 'Konuşmayı sen başlat. İlk mesajını yaz.' :
      `AI Asistan şu yanıtı verdi: "${context}"\n\nBuna karşılık, persona karakterine uygun bir sonraki müşteri mesajını yaz.`,
      '',
      'KURALLAR:',
      '- SADECE müşteri mesajını yaz, AI\'ın yanıtını yazma.',
      '- Kısa ve doğal ol. Gerçek bir insan gibi yaz.',
      '- Amacına uygun ilerle. Sipariş vermeye çalış.',
      '- Eğer AI siparişini aldıysa "tamam teşekkürler" de ve konuşmayı bitir.',
      '- Kesinlikle JSON veya formatlı çıktı verme, doğrudan mesajı yaz.',
    ].join('\n');

    try {
      const result = await provider.complete({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        maxTokens: 200,
      });
      return result.content.trim();
    } catch {
      return persona.goal;
    }
  }
}
