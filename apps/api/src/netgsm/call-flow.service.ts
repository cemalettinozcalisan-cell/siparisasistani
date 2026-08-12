import { Injectable, Logger } from '@nestjs/common';
import { TelephonyProviderFactory } from './providers/provider.factory';
import { NetgsmXmlBuilder } from './xml/xml-builder';
import { SupabaseService } from '../common/supabase.client';
import { AiBrainService } from '../ai/brain/ai-brain.service';
import { VoiceService } from '../voice/voice.service';

@Injectable()
export class CallFlowService {
  private readonly logger = new Logger(CallFlowService.name);

  constructor(
    private readonly telephony: TelephonyProviderFactory,
    private readonly xml: NetgsmXmlBuilder,
    private readonly supabase: SupabaseService,
    private readonly brain: AiBrainService,
    private readonly voice: VoiceService,
  ) {}

  async handleIncomingCall(tenantId: string, phone: string, callId: string): Promise<string> {
    const settings = await this.getSettings(tenantId);

    if (settings?.maintenance_mode) {
      const result = await this.voice.generateSpeech(
        settings.maintenance_message || 'Şu an hizmet veremiyoruz.', tenantId,
      );
      const url = await this.storeAudio(tenantId, result.audio);
      return this.xml.buildPlayAudio(url);
    }

    if (settings?.business_hours_enabled && !this.isWithinHours(settings)) {
      const result = await this.voice.generateSpeech(
        settings.after_hours_message || 'Siparişinizi not alıyorum.', tenantId,
      );
      const url = await this.storeAudio(tenantId, result.audio);
      return this.xml.buildPlayAudio(url);
    }

    const sessionId = await this.createSession(tenantId, phone, callId);

    const welcomeAudio = await this.voice.generateSpeech(
      'Merhaba, sipariş hattımıza hoş geldiniz. Size nasıl yardımcı olabilirim?', tenantId,
    );

    await this.updateCallStatus(sessionId, 'AI_SPEAKING');

    const audioUrl = await this.storeAudio(tenantId, welcomeAudio.audio);
    return this.xml.buildConversationGather({
      audioUrl,
      actionUrl: `${process.env.API_URL}/api/netgsm/webhook/conversation/${sessionId}`,
      speechTimeout: 3,
      maxSilence: 5,
    });
  }

  async processUserInput(sessionId: string, userMessage: string): Promise<string> {
    await this.updateCallStatus(sessionId, 'PROCESSING');

    const session = await this.getSession(sessionId);
    if (!session) return this.xml.buildHangup();

    const brainInput = {
      tenantId: session.tenant_id,
      channel: 'phone' as const,
      channelSource: 'netgsm',
      phone: session.phone,
      messages: [{ role: 'user', content: userMessage }],
      sessionId,
    };

    const result = await this.brain.process(brainInput);

    // ---- Faz 3: Akıllı Yönlendirme (Intent-based) ----
    if (result.intent === 'COMPLAINT' && !result.orderCreated) {
      try {
        await this.supabase.db.from('complaints').insert({
          tenant_id: session.tenant_id,
          phone: session.phone,
          source: 'phone',
          category: result.complaintType || 'general',
          severity: result.complaintSeverity || 'medium',
          description: `Telefon görüşmesi sırasında şikayet tespit edildi. Müşteri: "${userMessage}"`,
          priority: result.escalationLevel && result.escalationLevel >= 3 ? 'high' : 'medium',
          status: 'open',
        });
        this.logger.log(`Complaint auto-created for session ${sessionId} - severity: ${result.complaintSeverity}`);
      } catch (e) {
        this.logger.error(`Complaint creation failed: ${(e as Error).message}`);
      }

      const complaintAudio = await this.voice.generateSpeech(
        'Talebinizi not aldık. En kısa sürede size dönüş yapacağız.', session.tenant_id,
      );
      const url = await this.storeAudio(session.tenant_id, complaintAudio.audio);
      await this.updateCallStatus(sessionId, 'COMPLAINT_CREATED');
      return this.xml.buildPlayAudio(url);
    }

    if (result.intent === 'WHOLESALE') {
      await this.updateCallStatus(sessionId, 'WHOLESALE_LEAD');
      this.logger.log(`Wholesale lead detected for session ${sessionId} from ${session.phone}`);
    }

    if (result.intent === 'LEGAL' || (result.escalationLevel && result.escalationLevel >= 4)) {
      const legalAudio = await this.voice.generateSpeech(
        'Bu konuda sizi yetkiliyle görüştürmem gerekiyor. Kısa süre sonra sizi arayacağız.', session.tenant_id,
      );
      const url = await this.storeAudio(session.tenant_id, legalAudio.audio);
      await this.updateCallStatus(sessionId, 'LEGAL_ESCALATION');
      return this.xml.buildPlayAudio(url);
    }
    // ---- /Faz 3 routing ----

    // Faz 4: Görüşme içi WhatsApp/Belge gönderimi
    if (result.sendWhatsapp && session.phone) {
      try {
        const telephony = this.telephony.getProvider('netgsm');
        await (telephony as any).sendSms(session.phone,
          `SiparisAsistani - Istediginiz bilgi:\n\n${result.whatsappMessage || result.reply}`
        );
        this.logger.log(`In-call document sent to customer ${session.phone} via SMS`);
      } catch (e) {
        this.logger.warn(`In-call document send failed: ${(e as Error).message}`);
      }
    }

    if (result.orderCreated) {
      const responseAudio = await this.voice.generateSpeech(
        `Siparişiniz oluşturuldu. Sipariş numaranız ${result.orderNumber}. Teşekkür ederiz.`, session.tenant_id,
      );
      const audioUrl = await this.storeAudio(session.tenant_id, responseAudio.audio);
      await this.updateCallStatus(sessionId, 'COMPLETED');
      return this.xml.buildPlayAudio(audioUrl);
    }

    if (result.needsHuman) {
      await this.updateCallStatus(sessionId, 'HUMAN_TRANSFER');
      const humanAudio = await this.voice.generateSpeech(
        'Sizi yetkili arkadaşımıza aktarıyorum.', session.tenant_id,
      );
      const url = await this.storeAudio(session.tenant_id, humanAudio.audio);
      return this.xml.buildPlayAudio(url);
    }

    if (result.afterHours || result.maintenanceMode) {
      return this.xml.buildHangup();
    }

    const responseAudio = await this.voice.generateSpeech(result.reply, session.tenant_id);
    const audioUrl = await this.storeAudio(session.tenant_id, responseAudio.audio);
    await this.updateCallStatus(sessionId, 'AI_SPEAKING');

    return this.xml.buildConversationGather({
      audioUrl,
      actionUrl: `${process.env.API_URL}/api/netgsm/webhook/conversation/${sessionId}`,
      speechTimeout: 3,
      maxSilence: 5,
    });
  }

  async handleDtmf(sessionId: string, digits: string): Promise<string> {
    if (digits === '1') {
      return this.xml.buildRedirect(`/api/netgsm/webhook/conversation/${sessionId}`);
    }
    return this.xml.buildHangup();
  }

  private async createSession(tenantId: string, phone: string, callId: string): Promise<string> {
    const { data, error } = await this.supabase.db
      .from('conversation_sessions')
      .insert({
        tenant_id: tenantId, channel: 'phone', channel_source: 'netgsm',
        phone, status: 'active', call_status: 'RINGING',
      })
      .select('id')
      .single();
    if (error) throw new Error(`Session creation failed: ${error.message}`);
    return data.id;
  }

  async updateCallStatus(sessionId: string, status: string) {
    await this.supabase.db.from('conversation_sessions').update({ call_status: status }).eq('id', sessionId);
  }

  async getSession(sessionId: string) {
    const { data } = await this.supabase.db.from('conversation_sessions').select('*').eq('id', sessionId).single();
    return data;
  }

  async storeAudio(tenantId: string, buffer: Buffer): Promise<string> {
    const fileName = `voice/calls/${tenantId}/${Date.now()}.mp3`;
    await this.supabase.db.storage.from('voice-cache').upload(fileName, buffer, { contentType: 'audio/mpeg', upsert: true });
    return `${process.env.SUPABASE_URL}/storage/v1/object/public/voice-cache/${fileName}`;
  }

  private async getSettings(tenantId: string) {
    const { data } = await this.supabase.db
      .from('tenant_settings')
      .select('maintenance_mode, maintenance_message, business_hours_enabled, business_hours_start, business_hours_end, after_hours_message')
      .eq('tenant_id', tenantId)
      .single();
    return data;
  }

  private isWithinHours(settings: Record<string, unknown>): boolean {
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = ((settings.business_hours_start as string) || '08:00').split(':').map(Number);
    const [eh, em] = ((settings.business_hours_end as string) || '18:30').split(':').map(Number);
    return m >= sh * 60 + sm && m <= eh * 60 + em;
  }
}
