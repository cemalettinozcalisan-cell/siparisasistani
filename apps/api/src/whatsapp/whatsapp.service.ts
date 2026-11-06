import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase.client';
import { AiBrainService } from '../ai/brain/ai-brain.service';
import { WebhookDedupService } from '../webhook/webhook-dedup.service';
import { ChannelHealthService } from '../channel-health/channel-health.service';
import { WhatsAppConversationsService } from './conversations/conversations.service';
import { MetaWhatsappProvider } from '../messages/providers/meta-whatsapp.provider';
import { generateSessionLabel, sessionWindowStart } from '../common/chat-session';

interface WaMessage {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; caption?: string; mime_type?: string };
  document?: { id?: string; caption?: string; mime_type?: string; filename?: string };
}

interface SessionHistoryItem {
  role: string;
  content: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly brain: AiBrainService,
    private readonly dedup: WebhookDedupService,
    private readonly channelHealth: ChannelHealthService,
    private readonly conversations: WhatsAppConversationsService,
    private readonly whatsapp: MetaWhatsappProvider,
  ) {}

  get verifyToken(): string {
    return this.config.get<string>('WHATSAPP_VERIFY_TOKEN') || 'siparis2026';
  }

  verifyWebhook(mode?: string, token?: string, challenge?: string): { ok: boolean; challenge?: string } {
    if (mode === 'subscribe' && token && token === this.verifyToken) {
      return { ok: true, challenge };
    }
    return { ok: false };
  }

  async handleWebhook(body: Record<string, unknown>): Promise<{ status: string }> {
    const entries = (body?.entry as Record<string, unknown>[]) || [];
    for (const entry of entries) {
      const changes = (entry?.changes as Record<string, unknown>[]) || [];
      for (const change of changes) {
        const value = (change?.value as Record<string, unknown>) || {};
        const messages = (value?.messages as WaMessage[]) || [];
        if (!messages.length) continue;

        const metadata = (value?.metadata as Record<string, unknown>) || {};
        const phoneNumberId = String(metadata.phone_number_id || '');
        const tenantId = await this.resolveTenantId(phoneNumberId);
        if (!tenantId) {
          this.logger.warn(`WhatsApp: tenant bulunamadi (phone_number_id=${phoneNumberId})`);
          continue;
        }

        const contacts = (value?.contacts as Record<string, unknown>[]) || [];
        const profile = (contacts[0]?.profile as Record<string, unknown>) || {};
        const profileName = String(profile.name || '');

        for (const msg of messages) {
          try {
            await this.processMessage(tenantId, msg, profileName);
          } catch (e) {
            const err = e as Error;
            this.logger.error(`WhatsApp mesaj isleme hatasi: ${err.message}`);
            await this.channelHealth.record(tenantId, 'whatsapp', false, {
              error: err.message,
              errorCode: 'WA_PROCESS',
            });
          }
        }
      }
    }
    return { status: 'ok' };
  }

  private async resolveTenantId(phoneNumberId: string): Promise<string | null> {
    if (phoneNumberId) {
      const { data } = await this.supabase.db
        .from('api_keys')
        .select('tenant_id')
        .eq('provider', 'meta_whatsapp')
        .eq('api_secret', phoneNumberId)
        .eq('active', true)
        .maybeSingle();
      if (data?.tenant_id) return data.tenant_id as string;
    }
    return this.config.get<string>('DEFAULT_TENANT_ID') || null;
  }

  private async processMessage(tenantId: string, msg: WaMessage, profileName: string) {
    if (!msg?.from) return;

    const messageId = String(msg.id || '');
    if (messageId) {
      const duplicate = await this.dedup.claim(tenantId, 'whatsapp', messageId);
      if (duplicate) {
        this.logger.log(`WhatsApp duplicate ${messageId} atlandi`);
        return;
      }
    }

    const phone = this.normalizePhone(String(msg.from));
    const convId = await this.conversations.findOrCreate(tenantId, phone);

    if (msg.type === 'image' || msg.type === 'document') {
      await this.processMedia(tenantId, msg, profileName, convId, phone);
      return;
    }

    if (msg.type !== 'text') {
      this.logger.log(`WhatsApp desteklenmeyen mesaj tipi: ${msg.type}`);
      return;
    }

    const text = String(msg.text?.body || '').trim();
    if (!text) return;

    await this.conversations.addMessage({
      tenantId,
      conversationId: convId,
      direction: 'incoming',
      body: text,
    });

    const { sessionId, history } = await this.loadSession(tenantId, phone);
    history.push({ role: 'customer', content: text });

    const result = await this.brain.process({
      tenantId,
      channel: 'whatsapp',
      channelSource: 'whatsapp',
      phone,
      sessionId,
      messages: history.map((m) => ({
        role: m.role === 'customer' || m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    });

    const aiReply = (result.reply || '').trim();
    if (!aiReply) return;

    const storedMessages = result.resetHistory
      ? [{ role: 'customer', content: text }, { role: 'assistant', content: aiReply }]
      : [...history, { role: 'assistant', content: aiReply }];
    const effectiveSessionId = result.sessionId || sessionId;
    if (effectiveSessionId) {
      await this.supabase.db
        .from('conversation_sessions')
        .update({
          messages: storedMessages,
          updated_at: new Date().toISOString(),
          status: result.orderCreated || result.sessionClosed ? 'completed' : 'active',
          ...(result.sessionClosed
            ? { end_reason: 'goodbye', ended_at: new Date().toISOString() }
            : {}),
        })
        .eq('id', effectiveSessionId);
    }

    const outgoingId = await this.conversations.addMessage({
      tenantId,
      conversationId: convId,
      direction: 'outgoing',
      body: aiReply,
      status: 'sending',
    });

    await this.deliver(tenantId, phone, aiReply, outgoingId);

    this.logger.log(`WhatsApp cevap gonderildi (${profileName || phone}): ${aiReply.substring(0, 80)}`);
  }

  private async processMedia(
    tenantId: string,
    msg: WaMessage,
    profileName: string,
    convId: string,
    phone: string,
  ) {
    const media = msg.image || msg.document;
    const mediaId = String(media?.id || '');
    const caption = String(media?.caption || '').trim();
    let mediaUrl: string | undefined;
    if (mediaId) {
      try {
        mediaUrl = await this.saveMedia(tenantId, mediaId, String(msg.id || ''), media?.mime_type);
      } catch (e) {
        this.logger.warn(`WhatsApp medya indirilemedi: ${(e as Error).message}`);
      }
    }

    await this.conversations.addMessage({
      tenantId,
      conversationId: convId,
      direction: 'incoming',
      body: caption || '[Görsel/Dekont]',
      mediaUrl,
    });

    // OCR yok: müşteriden metin teyidi iste (dekont işaretlemesi metinle yapılır).
    const reply = 'Dekontunuzu aldım. Siparişinizi oluşturmak için lütfen "gönderdim" yazın.';
    const outgoingId = await this.conversations.addMessage({
      tenantId,
      conversationId: convId,
      direction: 'outgoing',
      body: reply,
      status: 'sending',
    });
    await this.deliver(tenantId, phone, reply, outgoingId);
    this.logger.log(`WhatsApp medya alindi (${profileName || phone})`);
  }

  private async saveMedia(
    tenantId: string,
    mediaId: string,
    messageId: string,
    mimeType?: string,
  ): Promise<string | undefined> {
    const creds = await this.whatsapp.getCredentials(tenantId);
    if (!creds) return undefined;

    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${creds.token}` },
    });
    if (!metaRes.ok) throw new Error(`media meta HTTP ${metaRes.status}`);
    const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
    if (!meta.url) throw new Error('media url yok');

    const binRes = await fetch(meta.url, { headers: { Authorization: `Bearer ${creds.token}` } });
    if (!binRes.ok) throw new Error(`media download HTTP ${binRes.status}`);
    const buffer = Buffer.from(await binRes.arrayBuffer());

    const contentType = mimeType || meta.mime_type || 'image/jpeg';
    const ext = (contentType.split('/')[1] || 'bin').split(';')[0];
    const path = `${tenantId}/${messageId || Date.now()}.${ext}`;

    const bucketCheck = await this.supabase.db.storage.getBucket('whatsapp-media');
    if (bucketCheck.error) {
      await this.supabase.db.storage.createBucket('whatsapp-media', { public: true });
    }
    const { error } = await this.supabase.db.storage
      .from('whatsapp-media')
      .upload(path, buffer, { contentType, upsert: true });
    if (error) throw new Error(error.message);

    const { data } = this.supabase.db.storage.from('whatsapp-media').getPublicUrl(path);
    return data?.publicUrl;
  }

  private async deliver(tenantId: string, phone: string, body: string, outgoingId?: string) {
    try {
      const result = await this.whatsapp.send({ tenantId, channel: 'whatsapp', to: phone, body });
      if (result.success) {
        if (outgoingId) {
          await this.supabase.db
            .from('whatsapp_messages')
            .update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null })
            .eq('id', outgoingId);
        }
        await this.channelHealth.record(tenantId, 'whatsapp', true);
        return;
      }

      this.logger.warn(`WhatsApp aninda gonderim basarisiz (kuyruga birakildi): ${result.error}`);
      if (outgoingId) {
        await this.supabase.db
          .from('whatsapp_messages')
          .update({ status: 'queued', error_message: result.error || null })
          .eq('id', outgoingId);
      }
      await this.channelHealth.record(tenantId, 'whatsapp', false, {
        error: result.error || undefined,
        errorCode: 'WA_SEND',
      });
    } catch (e) {
      const err = e as Error;
      this.logger.warn(`WhatsApp gonderim hatasi (kuyruga birakildi): ${err.message}`);
      if (outgoingId) {
        await this.supabase.db
          .from('whatsapp_messages')
          .update({ status: 'queued', error_message: err.message })
          .eq('id', outgoingId);
      }
    }
  }

  private async loadSession(
    tenantId: string,
    phone: string,
  ): Promise<{ sessionId: string; history: SessionHistoryItem[] }> {
    const run = (windowColumn: 'updated_at' | 'created_at') =>
      this.supabase.db
        .from('conversation_sessions')
        .select('id, messages')
        .eq('tenant_id', tenantId)
        .eq('phone', phone)
        .eq('channel', 'whatsapp')
        .or('status.eq.active,and(status.eq.completed,order_id.not.is.null)')
        .gte(windowColumn, sessionWindowStart())
        .order('created_at', { ascending: false })
        .limit(1);

    let { data, error } = await run('updated_at');
    if (error) ({ data } = await run('created_at'));

    if (data && data.length > 0) {
      const row = data[0] as Record<string, unknown>;
      let history: SessionHistoryItem[] = [];
      try {
        const raw = typeof row.messages === 'string' ? JSON.parse(row.messages) : row.messages;
        if (Array.isArray(raw)) history = raw as SessionHistoryItem[];
      } catch {
        history = [];
      }
      return { sessionId: String(row.id || ''), history };
    }

    const { data: created } = await this.supabase.db
      .from('conversation_sessions')
      .insert({
        tenant_id: tenantId,
        channel: 'whatsapp',
        channel_source: 'whatsapp',
        phone,
        status: 'active',
        messages: [],
        session_label: generateSessionLabel(),
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    return { sessionId: String((created as Record<string, unknown>)?.id || ''), history: [] };
  }

  private normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 11) return `9${digits}`;
    return digits;
  }
}
