import { Injectable, Logger } from '@nestjs/common';
import { AiBrainService } from '../../ai/brain/ai-brain.service';
import { NetgsmProvider } from '../providers/netgsm.provider';
import { SupabaseService } from '../../common/supabase.client';

@Injectable()
export class IncomingSmsWebhook {
  private readonly logger = new Logger(IncomingSmsWebhook.name);

  constructor(
    private readonly brain: AiBrainService,
    private readonly netgsm: NetgsmProvider,
    private readonly supabase: SupabaseService,
  ) {}

  async handle(body: Record<string, unknown>) {
    const rawPhone = String(body.gsmno || body.number || body.msisdn || body.from || '');
    const message = String(body.message || body.msg || body.text || body.content || '');
    const tenantId = String(body.tenant_id || '00000000-0000-0000-0000-000000000001');

    if (!rawPhone || !message) {
      this.logger.warn('SMS webhook received empty phone or message');
      return { received: false, reason: 'empty payload' };
    }

    // Normalize phone: remove +, spaces, leading 0
    const phone = rawPhone.replace(/[+\s()]/g, '').replace(/^0/, '');
    this.logger.log(`SMS from ${phone}: ${message.substring(0, 80)}`);

    // Find active SMS session for this phone (last 5 minutes)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: sessions } = await this.supabase.db
      .from('conversation_sessions')
      .select('id, messages, status')
      .eq('phone', phone)
      .eq('channel', 'sms')
      .eq('status', 'active')
      .gte('created_at', fiveMinAgo)
      .order('created_at', { ascending: false })
      .limit(1);

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
        role: m.role === 'customer' ? 'user' : 'assistant',
        content: m.content,
      })),
      channel: 'sms',
      channelSource: 'netgsm',
    });

    // Append AI reply to history
    const aiReply = result.reply || '';
    if (aiReply) {
      history.push({ role: 'assistant', content: aiReply });

      // Update session with full history
      await this.supabase.db
        .from('conversation_sessions')
        .update({
          messages: history,
          updated_at: new Date().toISOString(),
          status: result.orderCreated ? 'completed' : 'active',
        })
        .eq('id', sessionId);

      // Send AI reply back via SMS
      await this.netgsm.sendSms(rawPhone, aiReply);
    }

    return { received: true, replySent: !!aiReply, sessionId };
  }
}
