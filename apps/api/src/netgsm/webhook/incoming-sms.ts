import { Injectable, Logger } from '@nestjs/common';
import { AiBrainService } from '../../ai/brain/ai-brain.service';
import { NetgsmProvider } from '../providers/netgsm.provider';
import { SupabaseService } from '../../common/supabase.client';
import { OrderEngineService } from '../../order-engine/order-engine.service';
import { generateSessionLabel, sessionWindowStart } from '../../common/chat-session';

@Injectable()
export class IncomingSmsWebhook {
  private readonly logger = new Logger(IncomingSmsWebhook.name);

  constructor(
    private readonly brain: AiBrainService,
    private readonly netgsm: NetgsmProvider,
    private readonly supabase: SupabaseService,
    private readonly orderEngine: OrderEngineService,
  ) {}

  async handle(body: Record<string, unknown>) {
    const rawPhone = String(body.gsmno || body.number || body.msisdn || body.from || '');
    const message = String(body.message || body.msg || body.text || body.content || '');
    const tenantId = String(body.tenant_id || '00000000-0000-0000-0000-000000000001');

    if (!rawPhone) {
      this.logger.warn('SMS webhook received empty phone');
      return { received: false, reason: 'empty payload' };
    }

    // Normalize phone: remove +, spaces, leading 0
    const phone = rawPhone.replace(/[+\s()]/g, '').replace(/^0/, '');
    this.logger.log(`SMS from ${phone}: ${message.substring(0, 80)}`);

    // Dekont tespiti: yazısız medya (boş mesaj) veya "ödedim/dekont attım" beyanı.
    // Bekleyen IBAN siparişi varsa otomatik esnaf bildirimi tetiklenir (AI çağrısı yapılmaz).
    const isDekontHint = !message || /dekont|att[ıi]m|gönderdim|gönderdik|ödedim|havale\s*(yapt|gönder)|transfer\s*(yapt|gönder)/i.test(message);
    if (isDekontHint) {
      const order = await this.orderEngine.findAwaitingDekontOrder(tenantId, phone);
      if (order) {
        const handled = await this.orderEngine.markDekontReceived(order.id, 'auto');
        if (handled) {
          const reply = 'Dekontunuz alındı, esnafımız onaylayacak. En kısa sürede kargoya veriyoruz.';
          await this.netgsm.sendSms(rawPhone, reply);
          return { received: true, replySent: true, sessionId: null, dekontDetected: true };
        }
      }
    }

    // Yalnızca medya mesajı (yazısız) ve eşleşen sipariş yoksa işlenmeden döner.
    if (!message) {
      return { received: false, reason: 'empty message' };
    }

    // Son pencere icindeki SMS oturumu (siparis sonrasi devam icin completed dahil)
    const sessionWindow = sessionWindowStart();
    const run = (windowColumn: 'updated_at' | 'created_at') =>
      this.supabase.db
        .from('conversation_sessions')
        .select('id, messages, status')
        .eq('tenant_id', tenantId)
        .eq('phone', phone)
        .eq('channel', 'sms')
        .or('status.eq.active,and(status.eq.completed,order_id.not.is.null)')
        .gte(windowColumn, sessionWindow)
        .order('created_at', { ascending: false })
        .limit(1);

    let { data: sessions, error: sessionErr } = await run('updated_at');
    if (sessionErr) ({ data: sessions } = await run('created_at'));

    let sessionId: string;
    let history: { role: string; content: string }[] = [];

    if (sessions && sessions.length > 0) {
      // Resume existing session
      sessionId = sessions[0].id as string;
      const storedMessages = (sessions[0].messages as Record<string, unknown>[]) || [];
      history = storedMessages.map((m) => ({ role: String(m.role || 'assistant'), content: String(m.content || '') }));
      this.logger.log(`Resumed SMS session ${sessionId} with ${history.length} messages`);
    } else {
      // Create new session
      const { data: newSession } = await this.supabase.db
        .from('conversation_sessions')
        .insert({
          tenant_id: tenantId,
          channel: 'sms',
          channel_source: 'netgsm',
          phone,
          status: 'active',
          messages: [],
          session_label: generateSessionLabel(),
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      sessionId = (newSession?.id as string) || '';
      this.logger.log(`Created new SMS session ${sessionId}`);
    }

    // Append customer message to history
    history.push({ role: 'customer', content: message });

    // Process through AI Brain with full conversation history
    const result = await this.brain.process({
      tenantId,
      phone,
      sessionId,
      messages: history.map((m) => ({
        role: m.role === 'customer' || m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      channel: 'sms',
      channelSource: 'netgsm',
    });

    // Append AI reply to history
    const aiReply = result.reply || '';
    if (aiReply) {
      const storedMessages = result.resetHistory
        ? [{ role: 'customer', content: message }, { role: 'assistant', content: aiReply }]
        : [...history, { role: 'assistant', content: aiReply }];

      // Update session with full history
      await this.supabase.db
        .from('conversation_sessions')
        .update({
          messages: storedMessages,
          updated_at: new Date().toISOString(),
          status: result.orderCreated ? 'completed' : 'active',
        })
        .eq('id', result.sessionId || sessionId);

      // Send AI reply back via SMS
      await this.netgsm.sendSms(rawPhone, aiReply);

      const orderSummary = result.orderSummary || '';
      if (orderSummary) {
        try {
          await this.netgsm.sendSms(rawPhone, orderSummary);
        } catch (e) {
          this.logger.warn(`SMS siparis ozeti gonderilemedi: ${(e as Error).message}`);
        }
      }
    }

    return { received: true, replySent: !!aiReply, sessionId };
  }
}
