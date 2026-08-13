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
  { id: 'p01', name: 'Ahmet Uysal', phone: 'SIM-05320000001', channel: 'phone', category: 'Normal', goal: '2 kg Kangal Sucuk siparişi ver', behaviorPrompt: 'Kibar ve net konuşan bir müşterisin. Siparişini hızlıca ver, adres ve ödeme bilgilerini eksiksiz söyle.' },
  { id: 'p02', name: 'Mehmet Kaya', phone: 'SIM-05320000002', channel: 'phone', category: 'Kararsız', goal: '1 kg Pastırma al ama önce kargo süresini sor', behaviorPrompt: 'Kararsızsın. Önce kargo süresini sor, sonra ürün değiştirmeyi düşün, en son karar ver.' },
  { id: 'p03', name: 'Ali Vural', phone: 'SIM-05320000003', channel: 'sms', category: 'Normal', goal: '2 kg Kavurma sipariş et', behaviorPrompt: 'SMS ile sipariş veriyorsun. Kısa ve net mesajlar at. "2 kilo kavurma", "adres Ankara", "tamam" gibi.' },
  { id: 'p04', name: 'Burak Eren', phone: 'SIM-05320000004', channel: 'sms', category: 'Edge', goal: '1 kg Tulum Peyniri al', behaviorPrompt: 'Türkçen zayıf. Kelimeleri karıştır, devrik cümleler kur. "Ben almak 1 kilo peynir", "adres İstanbul" gibi.' },
  { id: 'p05', name: 'Fatma Demir', phone: 'SIM-05320000005', channel: 'whatsapp', category: 'Normal', goal: 'Hediye paketi olarak Kangal Sucuk sipariş et, not eklet', behaviorPrompt: 'Nazik ve detaylı bir müşterisin. Hediye göndereceksin, paketleme ve hediye notu hakkında sor. Adres ve ödeme eksiksiz ver.' },
  { id: 'p06', name: 'Emine Şahin', phone: 'SIM-05320000006', channel: 'whatsapp', category: 'Pazarlık', goal: '3 kg sucuk al ama indirim iste', behaviorPrompt: 'Her üründe indirim istiyorsun. "3 alana 1 bedava var mı?" gibi sorular sor. Fiyatı yüksek bulup alternatif sor.' },
  { id: 'p07', name: 'Zeynep Çelik', phone: 'SIM-05320000007', channel: 'instagram', category: 'Normal', goal: 'Fiyatları sor, emoji kullan, sonra 500 gr Pastırma al', behaviorPrompt: 'İlk kez sipariş veriyorsun. Fiyat sor, emoji kullan, ürün fotoğrafı iste, sonra karar verip sipariş et.' },
  { id: 'p08', name: 'Kemal Taş', phone: 'SIM-05320000008', channel: 'instagram', category: 'Aceleci', goal: '2 kg Afyon Kaymak al, hemen kargolansın', behaviorPrompt: 'Çok acelecisin. DM\'den yazıyorsun. "Hemen gönderin", "bugün kargoya verin". Kısa ve hızlı konuş.' },
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
    const maxTurns = 15;

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
          channelSource: 'simulator',
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
