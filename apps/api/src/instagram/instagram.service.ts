import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { SupabaseService } from '../common/supabase.client';
import { AiBrainService } from '../ai/brain/ai-brain.service';
import { WebhookDedupService } from '../webhook/webhook-dedup.service';
import { ChannelHealthService } from '../channel-health/channel-health.service';
import { OutboundService } from '../messages/outbound.service';
import { OutboundSendResult } from '../messages/outbound-channel.interface';
import { generateSessionLabel, isResetCommand, sessionWindowStart } from '../common/chat-session';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly brain: AiBrainService,
    private readonly dedup: WebhookDedupService,
    private readonly channelHealth: ChannelHealthService,
    private readonly outbound: OutboundService,
  ) {}

  private async getTenantConfig(tenantId: string): Promise<{
    token: string;
    igId: string;
    verifyToken: string;
    appSecret: string;
  }> {
    const { data } = await this.supabase.db
      .from('api_keys')
      .select('api_key, api_secret, extra_config')
      .eq('tenant_id', tenantId)
      .eq('provider', 'meta_instagram')
      .maybeSingle();

    const extra = (data?.extra_config as Record<string, unknown> | null) || {};
    return {
      token: String(data?.api_key || ''),
      igId: String(extra.ig_id || data?.api_secret || '').trim(),
      verifyToken: String(extra.verify_token || '').trim(),
      appSecret: String(extra.app_secret || '').trim(),
    };
  }

  /** Meta GET webhook doğrulaması: hub.challenge yalnızca tenant'ın verify token'ı ile döner. */
  async verifyWebhook(tenantId: string, mode: string, token: string, challenge: string): Promise<{ ok: boolean; challenge: string }> {
    const cfg = await this.getTenantConfig(tenantId);
    if (!cfg.verifyToken || mode !== 'subscribe' || token !== cfg.verifyToken) {
      this.logger.warn(`Instagram webhook verification failed for tenant ${tenantId}`);
      return { ok: false, challenge: '' };
    }
    return { ok: true, challenge };
  }

  /** Meta POST webhook imzası: X-Hub-Signature-256, tenant'ın app secret'ı ile doğrulanır. */
  async verifySignature(tenantId: string, rawBody: Buffer | string | undefined, signature: string | undefined): Promise<boolean> {
    if (!rawBody || !signature) return false;
    const cfg = await this.getTenantConfig(tenantId);
    if (!cfg.appSecret) return false;
    const expected = `sha256=${crypto.createHmac('sha256', cfg.appSecret).update(rawBody).digest('hex')}`;
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  async handleWebhook(tenantId: string, body: Record<string, unknown>) {
    this.logger.log(`Instagram webhook received for tenant ${tenantId}`);
    const cfg = await this.getTenantConfig(tenantId);
    const entries = body.entry as Record<string, unknown>[] || [];
    for (const entry of entries) {
      // Tenant izolasyonu: yalnızca bu tenant'a kayıtlı Instagram hesabının event'i işlenir.
      const entryId = String(entry.id || '').trim();
      if (!cfg.igId || entryId !== cfg.igId) {
        this.logger.warn(`Instagram webhook tenant mismatch: tenant=${tenantId} entry=${entryId || '-'} expected=${cfg.igId || '-'}`);
        continue;
      }
      const messaging = entry.messaging as Record<string, unknown>[] || [];
      for (const event of messaging) {
        const sender = event.sender as Record<string, unknown>;
        const message = event.message as Record<string, unknown>;
        if (!sender || !message) continue;

        // Idempotency: Meta aynı mesajı retry ederse çift işleme engelle
        const messageId = String((message as any).mid || '');
        if (messageId) {
          const isDuplicate = await this.dedup.claim(tenantId, 'instagram', messageId);
          if (isDuplicate) {
            this.logger.log(`Instagram duplicate message ${messageId} ignored`);
            continue;
          }
        }

        const igUserId = String(sender.id);
        const text = String(message.text || '');
        const username = String((sender as any).name || igUserId);

        // Find or create conversation
        const conv = await this.findOrCreateConversation(tenantId, igUserId, username);

        // Save incoming message
        await this.saveMessage(conv.id, tenantId, 'incoming', text);

        // Faz 3.3: Route to AI Brain for response
        try {
          // Get existing conversation session for context
          const run = (windowColumn: 'updated_at' | 'created_at') =>
            this.supabase.db
              .from('conversation_sessions')
              .select('id, messages')
              .eq('tenant_id', tenantId)
              .eq('phone', igUserId)
              .eq('channel', 'instagram')
              .or('status.eq.active,and(status.eq.completed,order_id.not.is.null)')
              .gte(windowColumn, sessionWindowStart())
              .order('created_at', { ascending: false })
              .limit(1);

          let { data: session, error: sessionErr } = await run('updated_at');
          if (sessionErr) ({ data: session } = await run('created_at'));

          let sessionId: string;
          let history: { role: string; content: string }[] = [];
          const isNewSession = !(session && session.length > 0);

          if (session && session.length > 0) {
            sessionId = session[0].id as string;
            history = typeof session[0].messages === 'string'
              ? JSON.parse(session[0].messages)
              : (session[0].messages as { role: string; content: string }[]) || [];
          } else {
            const { data: newSession } = await this.supabase.db
              .from('conversation_sessions')
              .insert({
                tenant_id: tenantId,
                channel: 'instagram',
                channel_source: 'instagram',
                phone: igUserId,
                status: 'active',
                messages: [],
                session_label: generateSessionLabel(),
                created_at: new Date().toISOString(),
              })
              .select('id')
              .single();

            sessionId = (newSession?.id as string) || '';
          }

          const resetCommand = isResetCommand(text);
          let welcomeBody = '';
          if (isNewSession && !resetCommand) {
            try {
              welcomeBody = await this.brain.buildTextWelcome(tenantId);
              await this.sendMessage(conv.id, tenantId, welcomeBody, igUserId);
            } catch (e) {
              this.logger.warn(`Instagram KVKK/karşılama gönderilemedi: ${(e as Error).message}`);
            }
          }

          history.push({ role: 'customer', content: text });

          const result = await this.brain.process({
            tenantId,
            phone: igUserId,
            sessionId,
            messages: history.map((m) => ({
              role: m.role === 'customer' || m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
            })),
            channel: 'instagram' as any,
            channelSource: 'instagram',
          });

          const effectiveSessionId = result.sessionId || sessionId;
          const resetOnlyWelcome = !!result.resetHistory;

          if (resetOnlyWelcome) {
            if (!welcomeBody) {
              try {
                welcomeBody = await this.brain.buildTextWelcome(tenantId);
                await this.saveMessage(conv.id, tenantId, 'outgoing', welcomeBody);
                await this.sendMessage(conv.id, tenantId, welcomeBody);
              } catch (e) {
                this.logger.warn(`Instagram KVKK/karşılama gönderilemedi: ${(e as Error).message}`);
              }
            }
            const storedMessages = [
              { role: 'customer', content: text },
              { role: 'assistant', content: welcomeBody },
            ];
            await this.supabase.db
              .from('conversation_sessions')
              .update({ messages: storedMessages, updated_at: new Date().toISOString(), status: 'active' })
              .eq('id', effectiveSessionId);
            this.logger.log(`Instagram yeni oturum: sadece KVKK/karsilama gonderildi (${username})`);
            continue;
          }

          const aiReply = result.reply || '';
          if (aiReply) {
            const storedMessages = [...history, { role: 'assistant', content: aiReply }];

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

            await this.sendMessage(conv.id, tenantId, aiReply, igUserId);

            this.logger.log(`Instagram DM reply sent to ${username}: ${aiReply.substring(0, 80)}`);
            await this.channelHealth.record(tenantId, 'instagram', true);
          }
        } catch (e) {
          this.logger.error(`Instagram DM brain processing failed: ${(e as Error).message}`);
          await this.channelHealth.record(tenantId, 'instagram', false, { error: (e as Error).message, errorCode: 'INSTAGRAM_PROCESS' });
        }
      }
    }
    return { status: 'ok' };
  }

  private async findOrCreateConversation(tenantId: string, igUserId: string, username: string) {
    const { data: existing } = await this.supabase.db
      .from('instagram_conversations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('instagram_user_id', igUserId)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) return existing;

    const { data: created } = await this.supabase.db
      .from('instagram_conversations')
      .insert({ tenant_id: tenantId, instagram_user_id: igUserId, username })
      .select('id')
      .single();

    return created || { id: igUserId };
  }

  private async saveMessage(conversationId: string, tenantId: string, direction: string, body: string) {
    await this.supabase.db.from('instagram_messages').insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      direction,
      body,
    });
  }

  async sendMessage(conversationId: string, tenantId: string, text: string, to?: string): Promise<OutboundSendResult> {
    let igUserId = String(to || '').trim();
    if (!igUserId) {
      const { data } = await this.supabase.db
        .from('instagram_conversations')
        .select('instagram_user_id')
        .eq('tenant_id', tenantId)
        .eq('id', conversationId)
        .maybeSingle();
      igUserId = String((data as Record<string, unknown> | null)?.instagram_user_id || '').trim();
    }

    // Tek kayıt: mesajı burada kaydet, çağıran taraflar tekrar kaydetmesin.
    await this.saveMessage(conversationId, tenantId, 'outgoing', text);

    if (!igUserId) {
      this.logger.warn(`Instagram DM hedef IGSID bulunamadı: conv=${conversationId}`);
      return { success: false, provider: 'meta_instagram', error: 'INSTAGRAM_RECIPIENT_MISSING' };
    }

    const result = await this.outbound.send({
      tenantId,
      channel: 'instagram',
      to: igUserId,
      body: text,
    });
    if (result.success) {
      this.logger.log(`Instagram DM out: conv=${conversationId}, to=${igUserId}, text=${text.substring(0, 80)}`);
    } else {
      this.logger.warn(`Instagram DM gönderilemedi: conv=${conversationId}, error=${result.error}`);
    }
    return result;
  }
}
