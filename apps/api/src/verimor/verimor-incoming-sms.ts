import { Injectable, Logger } from '@nestjs/common';
import { AiBrainService } from '../ai/brain/ai-brain.service';
import { VerimorSmsProvider } from './verimor-sms.provider';
import { SupabaseService } from '../common/supabase.client';
import { OrderEngineService } from '../order-engine/order-engine.service';
import { generateSessionLabel, sessionWindowStart } from '../common/chat-session';

/**
 * Verimor gelen SMS webhook'u.
 * Verimor PUSH gövdesi JSON DİZİ olarak gelir:
 * [{ message_id, type:"inbound", source_addr, destination_addr, content, ... }]
 * → AI Brain ile cevap üretir → Verimor SMS ile geri gönderir.
 */
@Injectable()
export class VerimorIncomingSms {
  private readonly logger = new Logger(VerimorIncomingSms.name);

  constructor(
    private readonly brain: AiBrainService,
    private readonly sms: VerimorSmsProvider,
    private readonly supabase: SupabaseService,
    private readonly orderEngine: OrderEngineService,
  ) {}

  async handle(body: unknown) {
    try {
      // Verimor bir dizi gönderir; ilk (veya tek) mesajı işle.
      const item: Record<string, unknown> = (Array.isArray(body) ? body[0] : body) || {};
      const rawPhone = String(item.source_addr || item.from || item.gsmno || item.number || item.msisdn || '');
      const message = String(item.content || item.message || item.msg || item.text || '');
      const tenantId = String(item.tenant_id || '00000000-0000-0000-0000-000000000001');

      if (!rawPhone) {
        this.logger.warn('Verimor SMS webhook: bos telefon');
        return { received: false, reason: 'empty payload' };
      }

      const phone = rawPhone.replace(/[+\s()]/g, '').replace(/^0/, '');
      this.logger.log(`Verimor SMS from ${phone}: ${message.substring(0, 80)}`);

      // Dekont tespiti
      const isDekontHint = !message || /dekont|att[ıi]m|gönderdim|gönderdik|ödedim|havale\s*(yapt|gönder)|transfer\s*(yapt|gönder)/i.test(message);
      if (isDekontHint) {
        const order = await this.orderEngine.findAwaitingDekontOrder(tenantId, phone);
        if (order) {
          const handled = await this.orderEngine.markDekontReceived(order.id, 'auto');
          if (handled) {
            const reply = 'Dekontunuz alındı, esnafımız onaylayacak. En kısa sürede kargoya veriyoruz.';
            await this.sms.sendSms(rawPhone, reply);
            return { received: true, replySent: true, dekontDetected: true };
          }
        }
      }

      if (!message) return { received: false, reason: 'empty message' };

      // Son pencere icindeki SMS oturumu (siparis sonrasi devam icin completed dahil)
      const sessionWindow = sessionWindowStart();
      const { data: sessions } = await this.supabase.db
        .from('conversation_sessions')
        .select('id, messages, status')
        .eq('tenant_id', tenantId)
        .eq('phone', phone)
        .eq('channel', 'sms')
        .or('status.eq.active,and(status.eq.completed,order_id.not.is.null)')
        .gte('created_at', sessionWindow)
        .order('created_at', { ascending: false })
        .limit(1);

      let sessionId: string;
      let history: { role: string; content: string }[] = [];

      if (sessions && sessions.length > 0) {
        sessionId = sessions[0].id as string;
        const stored = (sessions[0].messages as Record<string, unknown>[]) || [];
        history = stored.map((m) => ({ role: String(m.role || 'assistant'), content: String(m.content || '') }));
      } else {
        const { data: newSession } = await this.supabase.db
          .from('conversation_sessions')
          .insert({
            tenant_id: tenantId,
            channel: 'sms',
            channel_source: 'verimor',
            phone,
            status: 'active',
            messages: [],
            session_label: generateSessionLabel(),
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        sessionId = (newSession?.id as string) || '';
      }

      history.push({ role: 'customer', content: message });

      const result = await this.brain.process({
        tenantId,
        phone,
        sessionId,
        messages: history.map((m) => ({
          role: m.role === 'customer' ? 'user' : 'assistant',
          content: m.content,
        })),
        channel: 'sms',
        channelSource: 'verimor',
      } as never);

      const aiReply = (result as { reply?: string }).reply || '';
      if (aiReply) {
        const storedMessages = (result as { resetHistory?: boolean }).resetHistory
          ? [{ role: 'customer', content: message }, { role: 'assistant', content: aiReply }]
          : [...history, { role: 'assistant', content: aiReply }];
        await this.supabase.db
          .from('conversation_sessions')
          .update({
            messages: storedMessages,
            updated_at: new Date().toISOString(),
            status: (result as { orderCreated?: boolean }).orderCreated ? 'completed' : 'active',
          })
          .eq('id', (result as { sessionId?: string }).sessionId || sessionId);
        await this.sms.sendSms(rawPhone, aiReply);

        const orderSummary = (result as { orderSummary?: string }).orderSummary || '';
        if (orderSummary) {
          try {
            await this.sms.sendSms(rawPhone, orderSummary);
          } catch (e) {
            this.logger.warn(`Verimor siparis ozeti gonderilemedi: ${(e as Error).message}`);
          }
        }
      }

      return { received: true, replySent: !!aiReply, sessionId };
    } catch (e) {
      this.logger.error(`Verimor SMS isleme hatasi: ${(e as Error).message}`);
      return { received: false };
    }
  }
}
