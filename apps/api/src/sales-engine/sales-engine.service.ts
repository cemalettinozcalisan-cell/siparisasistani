import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../common/supabase.client';
import { WhatsAppConversationsService } from '../whatsapp/conversations/conversations.service';
import { InstagramService } from '../instagram/instagram.service';
import { OutboundService } from '../messages/outbound.service';
import { IysService } from '../iys/iys.service';

const PROMOTIONAL_TYPES = ['birthday', 'holiday', 'bulk', 'reorder', 'abandoned_cart'];

@Injectable()
export class SalesEngineService {
  private readonly logger = new Logger(SalesEngineService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly whatsapp: WhatsAppConversationsService,
    private readonly instagram: InstagramService,
    private readonly outbound: OutboundService,
    private readonly iys: IysService,
  ) {}

  // Tamamlanmayan sipariş hatırlatması: 10 dk -> 1., +2 saat -> 2. (en fazla 2)
  @Cron('*/5 * * * *')
  async checkIncompleteOrderReminders() {
    try {
      // Sessiz saatlerde gönderme (09:00 - 21:00)
      const hourNow = new Date().getHours();
      if (hourNow < 9 || hourNow >= 21) return;

      const now = Date.now();
      const tenMinAgo = new Date(now - 10 * 60 * 1000).toISOString();
      const dayAgo = new Date(now - 24 * 3600 * 1000).toISOString();

      const { data: sessions } = await this.supabase.db
        .from('conversation_sessions')
        .select('id, tenant_id, phone, channel, updated_at')
        .eq('status', 'active')
        .is('order_id', null)
        .gte('updated_at', dayAgo)
        .lt('updated_at', tenMinAgo)
        .order('updated_at', { ascending: true })
        .limit(50);

      for (const row of (sessions || []) as Record<string, unknown>[]) {
        const sessionId = String(row.id || '');
        const tenantId = String(row.tenant_id || '');
        const phone = this.normalizePhone(String(row.phone || ''));
        const channel = String(row.channel || '');
        if (!sessionId || !tenantId || !phone) continue;
        if (!['whatsapp', 'sms', 'phone', 'instagram'].includes(channel)) continue;

        // Aynı numarada daha yeni aktif bir konuşma varsa bu eski oturuma hatırlatma gönderme.
        if (await this.hasRecentActiveConversation(tenantId, phone, sessionId)) continue;

        // status kolonu (079 migration) varsa onu kullan; yoksa stage=99 sentinel'ine düş.
        const reminderResult = await this.supabase.db
          .from('follow_up_reminders')
          .select('stage, sent_at, status')
          .eq('session_id', sessionId)
          .order('stage', { ascending: true });

        let statusColumn = !reminderResult.error;
        let rows = (reminderResult.data || []) as {
          stage: number;
          sent_at: string | null;
          status?: string;
        }[];

        if (reminderResult.error) {
          const fallback = await this.supabase.db
            .from('follow_up_reminders')
            .select('stage, sent_at')
            .eq('session_id', sessionId)
            .order('stage', { ascending: true });
          if (fallback.error) continue;
          statusColumn = false;
          rows = (fallback.data || []) as { stage: number; sent_at: string | null }[];
        }

        // Müşteri cevap verdişse / 2. hatırlatma kesinleştiyse bir daha gönderme.
        const closed = statusColumn
          ? rows.some((r) => r.status === 'cancelled')
          : rows.some((r) => r.stage >= 2);
        if (closed) continue;
        const sentStage2 = rows.some(
          (r) => r.stage >= 2 && (!statusColumn || r.status === 'sent'),
        );
        if (sentStage2) continue;

        const updatedAt = String(row.updated_at || '');
        const sentRows = rows.filter(
          (r) => r.sent_at && (!statusColumn || r.status === 'sent'),
        );
        const latest = sentRows[sentRows.length - 1];

        // Müşteri son hatırlatmadan sonra yazdıysa 2. hatırlatmayı iptal et (tekrar stage 1 de gönderme).
        if (
          latest &&
          updatedAt &&
          new Date(updatedAt).getTime() > new Date(latest.sent_at as string).getTime()
        ) {
          if (statusColumn) {
            await this.supabase.db.from('follow_up_reminders').upsert(
              {
                tenant_id: tenantId,
                session_id: sessionId,
                stage: 2,
                status: 'cancelled',
                cancel_reason: 'customer_replied',
                last_activity_at: updatedAt || null,
                sent_at: null,
              },
              { onConflict: 'session_id,stage' },
            );
          } else {
            await this.supabase.db.from('follow_up_reminders').upsert(
              {
                tenant_id: tenantId,
                session_id: sessionId,
                stage: 99,
                last_activity_at: updatedAt || null,
                sent_at: new Date().toISOString(),
              },
              { onConflict: 'session_id,stage' },
            );
          }
          continue;
        }

        const stage1 = sentRows.find((r) => r.stage === 1);
        let stage = 1;
        if (!stage1) {
          stage = 1;
        } else if (now - new Date(stage1.sent_at as string).getTime() >= 2 * 3600 * 1000) {
          stage = 2;
        } else {
          continue;
        }

        const name = await this.resolveCustomerName(tenantId, phone);
        const prefix = name ? `${name}, ` : '';
        const body = stage === 1
          ? `${prefix}konuşmamız yarım kaldı. Kaldığımız yerden devam etmek ister misiniz?`
          : `${prefix}hâlâ yardımcı olabilirim. Devam etmek ister misiniz?`;

        const sent = await this.sendSystemMessage({
          tenantId,
          phone,
          body,
          sessionId,
          reminder: 'incomplete_order',
          stage,
        });

        if (sent) {
          const payload: Record<string, unknown> = {
            tenant_id: tenantId,
            session_id: sessionId,
            stage,
            last_activity_at: updatedAt || null,
            sent_at: new Date().toISOString(),
          };
          if (statusColumn) payload.status = 'sent';
          await this.supabase.db.from('follow_up_reminders').upsert(payload, {
            onConflict: 'session_id,stage',
          });
          this.logger.log(`Incomplete order reminder (stage ${stage}) for session ${sessionId}`);
        }
      }
    } catch (e) {
      this.logger.error(`Incomplete order reminder failed: ${(e as Error).message}`);
    }
  }

  // Havale/IBAN dekont hatırlatması (varsayılan 3 saat, tek sefer)
  @Cron('*/30 * * * *')
  async checkDekontReminders() {
    try {
      const configured = Number(process.env.DEKONT_REMINDER_HOURS || '3');
      const hours = Number.isFinite(configured) && configured > 0 ? configured : 3;
      const cutoff = new Date(Date.now() - hours * 3600000).toISOString();

      // Sessiz saatlerde gönderme (09:00 - 21:00)
      const hourNow = new Date().getHours();
      if (hourNow < 9 || hourNow >= 21) return;

      const { data: orders } = await this.supabase.db
        .from('orders')
        .select('id, tenant_id, order_number, customer_name, customer_phone, created_at')
        .eq('payment_method', 'iban')
        .in('payment_status', ['awaiting_dekont', 'waiting'])
        .neq('status', 'cancelled')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
        .lt('created_at', cutoff)
        .is('dekont_reminder_sent_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      const seenPhones = new Set<string>();
      for (const row of (orders || []) as Record<string, unknown>[]) {
        const tenantId = String(row.tenant_id || '');
        const phone = this.normalizePhone(String(row.customer_phone || ''));
        if (!tenantId || !phone) continue;

        // Telefon başına yalnızca EN SON bekleyen sipariş için hatırlat.
        if (seenPhones.has(phone)) continue;
        seenPhones.add(phone);

        // Müşteri şu an başka bir kanalda aktif konuşuyorsa hatırlatma gönderme.
        if (await this.hasRecentActiveConversation(tenantId, phone)) continue;

        const name = String(row.customer_name || '').trim();
        const orderNumber = String(row.order_number || '').trim();
        const body = [
          `Sayın${name ? ' ' + name : ''},`,
          orderNumber ? `${orderNumber} numaralı siparişiniz` : 'Siparişiniz',
          'havale/IBAN ödemesi bekliyor.',
          'Havaleyi yaptıysanız dekontu ileterek siparişinizi oluşturabiliriz.',
        ].join(' ');

        const sessionId = await this.findLatestSessionId(tenantId, phone, 'whatsapp');
        const sent = await this.sendSystemMessage({
          tenantId,
          phone,
          body,
          sessionId,
          orderId: String(row.id),
          reminder: 'dekont_reminder',
        });

        if (sent) {
          await this.supabase.db
            .from('orders')
            .update({ dekont_reminder_sent_at: new Date().toISOString() })
            .eq('id', row.id);
          this.logger.log(`Dekont reminder sent for order ${orderNumber || String(row.id)}`);
        }
      }
    } catch (e) {
      this.logger.error(`Dekont reminder check failed: ${(e as Error).message}`);
    }
  }

  // Abandoned cart check every hour (more frequent than daily ops)
  @Cron('0 * * * *') // every hour
  async checkAbandonedCarts() {
    this.logger.log('Abandoned cart check started');
    try {
      const { data: tenants } = await this.supabase.db
        .from('tenant_settings')
        .select('tenant_id, abandoned_cart_enabled, abandoned_cart_hours')
        .eq('abandoned_cart_enabled', true)
        .eq('sales_automation_enabled', true);

      for (const t of tenants || []) {
        const tid = (t as any).tenant_id;
        const hours = (t as any).abandoned_cart_hours || 24;
        const cutoff = new Date(Date.now() - hours * 3600000).toISOString();
        await this.processAbandonedCarts(tid, cutoff);
      }
    } catch (e) {
      this.logger.error(`Abandoned cart check failed: ${e}`);
    }
  }

  // Daily at 09:00 - check all automation rules
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async dailyAutomation() {
    this.logger.log('Sales Engine daily automation started');
    try {
      const { data: tenants } = await this.supabase.db
        .from('tenant_settings')
        .select('tenant_id, sales_automation_enabled, reorder_reminder_days, birthday_reminder_enabled, holiday_campaigns_enabled, birthday_discount_type, birthday_discount_value, birthday_message_template, campaign_channel')
        .eq('sales_automation_enabled', true);

      for (const t of tenants || []) {
        const tid = (t as any).tenant_id;
        const channel = (t as any).campaign_channel === 'sms' ? 'sms' : 'whatsapp';

        if ((t as any).reorder_reminder_days > 0) {
          await this.processReorderReminders(tid, (t as any).reorder_reminder_days);
        }
        if ((t as any).birthday_reminder_enabled) {
          await this.processBirthdayReminders(tid, (t as any).birthday_discount_type || 'percent', (t as any).birthday_discount_value || 10, (t as any).birthday_message_template || '', channel);
        }
        if ((t as any).holiday_campaigns_enabled) {
          await this.processHolidayCampaigns(tid, channel);
        }
      }
    } catch (e) {
      this.logger.error(`Sales Engine automation failed: ${e}`);
    }
  }

  private async processReorderReminders(tenantId: string, days: number) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();

    const { data: customers } = await this.supabase.db
      .from('customers')
      .select('id, name, phone')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    for (const c of customers || []) {
      const { data: lastOrder } = await this.supabase.db
        .from('orders')
        .select('order_number, total_price, created_at, id')
        .eq('tenant_id', tenantId)
        .eq('customer_id', (c as any).id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastOrder) continue;

      const lastDate = new Date(lastOrder.created_at as string);
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000);

      if (daysSince >= days) {
        // Get last order products for suggestion
        const { data: items } = await this.supabase.db
          .from('order_items')
          .select('product_name, quantity, unit')
          .eq('order_id', lastOrder.id);

        const productList = items?.map((i: any) => `${i.quantity} ${i.unit} ${i.product_name}`).join(', ') || 'sipariş';

        const message = `Merhaba ${(c as any).name}! ${daysSince} gün önce ${productList} siparişi vermiştiniz. Aynı siparişi tekrarlamak ister misiniz?`;

        await this.logCampaign(tenantId, 'reorder', (c as any).id, message, (c as any).phone);
        this.logger.log(`[Reorder] Tenant ${tenantId}: Customer ${(c as any).name} - ${daysSince} days since last order`);
      }
    }
  }

  private async processBirthdayReminders(tenantId: string, discountType: string, discountValue: number, messageTemplate: string, channel: 'sms' | 'whatsapp' = 'whatsapp') {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const { data: customers } = await this.supabase.db
      .from('customers')
      .select('id, name, phone, birth_date')
      .eq('tenant_id', tenantId)
      .not('birth_date', 'is', null)
      .is('deleted_at', null);

    if (!customers?.length) return;

    let sentCount = 0;
    for (const c of customers) {
      const birthDate = String((c as any).birth_date).split('T')[0]; // "2000-05-15"
      const parts = birthDate.split('-');
      if (parts.length < 3) continue;
      const birthMonth = parts[1];
      const birthDay = parts[2];

      if (birthMonth !== month || birthDay !== day) continue;

      let message: string;
      if (messageTemplate) {
        message = messageTemplate.replace('{name}', (c as any).name || 'Değerli Müşterimiz');
      } else {
        const discountDesc = discountType === 'percent' ? `%${discountValue} indirim` :
          discountType === 'fixed' ? `${discountValue} TL indirim` : 'ücretsiz kargo';
        message = `İyi ki doğdunuz ${(c as any).name || 'Değerli Müşterimiz'}! 🎂 Doğum gününüze özel ${discountDesc} kazandınız. Bugün yapacağınız alışverişte geçerlidir.`;
      }

      await this.logCampaign(tenantId, 'birthday', (c as any).id, message, (c as any).phone, channel);

      // Create notification
      try {
        await this.supabase.db.from('notifications').insert({
          tenant_id: tenantId,
          type: 'birthday',
          title: `🎂 Doğum Günü: ${(c as any).name}`,
          message: `Doğum günü mesajı gönderildi — ${message.substring(0, 40)}...`,
          status: 'unread',
        });
      } catch {}
      sentCount++;
    }

    this.logger.log(`[Birthday] Tenant ${tenantId}: ${sentCount} birthday messages sent for ${month}-${day}`);
  }

  private async processHolidayCampaigns(tenantId: string, channel: 'sms' | 'whatsapp' = 'whatsapp') {
    const { data: campaigns } = await this.supabase.db
      .from('sales_campaigns')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('type', 'holiday')
      .eq('active', true);

    for (const campaign of campaigns || []) {
      const { data: customers } = await this.supabase.db
        .from('customers')
        .select('id, name, phone')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .limit((campaign as any).max_customers || 100);

      for (const c of customers || []) {
        const message = (campaign as any).message_template
          .replace('{name}', (c as any).name || 'Değerli Müşterimiz');

        await this.logCampaign(tenantId, 'holiday', (c as any).id, message, (c as any).phone, channel);
      }
      this.logger.log(`[Campaign] Tenant ${tenantId}: Campaign ${(campaign as any).name} processed for ${customers?.length || 0} customers`);
    }
  }

  private async processAbandonedCarts(tenantId: string, cutoff: string) {
    // Find abandoned conversations across all channels (phone, whatsapp, instagram)
    const { data: sessions } = await this.supabase.db
      .from('conversation_sessions')
        .select('id, phone, channel, status, session_label, session_data, order_id, created_at')
      .eq('tenant_id', tenantId)
      .neq('status', 'completed')
        .neq('status', 'closed')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
        .lt('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(50);

    if (!sessions || sessions.length === 0) return;

      for (const s of sessions || []) {
        // Metin kanallarında tamamlanmayan siparişler artık yeni 10dk+2sa hatırlatmasıyla ele alınır.
        const sessionChannel = String((s as any).channel || '');
        if (
          ['whatsapp', 'sms', 'instagram'].includes(sessionChannel) &&
          !(s as any).order_id
        ) {
          continue;
        }
        const phone = (s as any).phone as string;
        if (!phone) continue;

        // Siparişi olan oturumda abandoned-cart çalışmasın.
        if ((s as any).order_id) continue;
        // Müşteri şu an aktif konuşuyorsa eski oturuma hatırlatma gönderme.
        if (await this.hasRecentActiveConversation(tenantId, phone, (s as any).id)) continue;

      // Find associated customer
      const { data: customer } = await this.supabase.db
        .from('customers')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('phone', phone)
        .maybeSingle();

      // Check if we already sent a reminder for this session
      const sessionLabel = (s as any).session_label || '';
      const { count: existing } = await this.supabase.db
        .from('campaign_logs')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('type', 'abandoned_cart')
        .like('message', `%${sessionLabel || s.id}%`);

      if (existing && existing > 0) continue; // already reminded

      const channelMap: Record<string, string> = {
        phone: '📞 telefonla',
        whatsapp: '💬 WhatsApp\'tan',
        instagram: '📸 Instagram\'dan',
      };
      const channelLabel = channelMap[(s as any).channel as string] || 'kanalınızdan';
      const customerName = (customer as any)?.name || 'Değerli Müşterimiz';
      const message = `Merhaba ${customerName}, ${channelLabel} siparişinizi tamamlamamıştınız. Kaldığınız yerden devam etmek ister misiniz?`;

      await this.logCampaign(tenantId, 'abandoned_cart', (customer as any)?.id || phone, message, phone);
      this.logger.log(`[AbandonedCart] Tenant ${tenantId}: Session ${(s as any).id} (${(s as any).channel}) - ${customerName}`);
    }
  }

  private async resolveCustomerName(tenantId: string, phone: string): Promise<string | undefined> {
    const variants = this.phoneVariants(phone);
    if (!variants.length) return undefined;
    try {
      const { data: customers } = await this.supabase.db
        .from('customers')
        .select('name')
        .eq('tenant_id', tenantId)
        .in('phone', variants)
        .limit(1);
      const customerName = String((customers?.[0] as Record<string, unknown> | undefined)?.name || '').trim();
      if (customerName) return customerName;

      const { data: orders } = await this.supabase.db
        .from('orders')
        .select('customer_name')
        .eq('tenant_id', tenantId)
        .in('customer_phone', variants)
        .order('created_at', { ascending: false })
        .limit(1);
      const orderName = String((orders?.[0] as Record<string, unknown> | undefined)?.customer_name || '').trim();
      return orderName || undefined;
    } catch {
      return undefined;
    }
  }

  private async findLatestSessionId(
    tenantId: string,
    phone: string,
    channel: string,
  ): Promise<string | undefined> {
    try {
      const { data } = await this.supabase.db
        .from('conversation_sessions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('channel', channel)
        .in('phone', this.phoneVariants(phone))
        .order('created_at', { ascending: false })
        .limit(1);
      return (data?.[0] as Record<string, unknown> | undefined)?.id as string | undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Sistem kaynaklı müşteri mesajı (hatırlatma).
   * Hem WhatsApp konuşmasına hem ai_audit_logs'a yazar; böylece panel ve AI
   * yapısal geçmişi mesajı görür. conversation_sessions.updated_at'e DOKUNMAZ.
   */
  private async sendSystemMessage(params: {
    tenantId: string;
    phone: string;
    body: string;
    sessionId?: string;
    orderId?: string;
    reminder: string;
    stage?: number;
  }): Promise<boolean> {
    let conversationId: string | undefined;
    let messageId: string | undefined;

    try {
      conversationId = await this.whatsapp.findOrCreate(params.tenantId, params.phone);
      messageId = await this.whatsapp.addMessage({
        tenantId: params.tenantId,
        conversationId,
        direction: 'outgoing',
        body: params.body,
        status: 'sending',
      });
    } catch (e) {
      this.logger.warn(`System message conversation save failed: ${(e as Error).message}`);
    }

    let sent = false;
    let channel: 'whatsapp' | 'sms' = 'whatsapp';
    try {
      const wa = await this.outbound.send({
        tenantId: params.tenantId,
        channel: 'whatsapp',
        to: params.phone,
        body: params.body,
        orderId: params.orderId,
      });
      sent = wa.success;
    } catch (e) {
      this.logger.warn(`System WhatsApp send failed: ${(e as Error).message}`);
    }

    if (messageId) {
      await this.supabase.db
        .from('whatsapp_messages')
        .update({ status: sent ? 'sent' : 'failed' })
        .eq('id', messageId);
    }

    if (!sent) {
      channel = 'sms';
      try {
        const sms = await this.outbound.send({
          tenantId: params.tenantId,
          channel: 'sms',
          to: params.phone,
          body: params.body,
          orderId: params.orderId,
        });
        sent = sms.success;
      } catch (e) {
        this.logger.warn(`System SMS send failed: ${(e as Error).message}`);
      }
    }

    try {
      await this.supabase.db.from('ai_audit_logs').insert({
        tenant_id: params.tenantId,
        session_id: params.sessionId || null,
        conversation_id: conversationId || null,
        system_prompt: null,
        user_message: '[SISTEM HATIRLATMASI]',
        model: 'system',
        provider: 'system',
        raw_response: JSON.stringify({
          reply: params.body,
          reminder: params.reminder,
          stage: params.stage ?? null,
          channel,
          sent,
        }),
        parsed_json: {
          reply: params.body,
          reminder: params.reminder,
          stage: params.stage ?? null,
          channel,
          sent,
        },
        confidence: 100,
        latency_ms: 0,
        success: sent,
      });
    } catch (e) {
      this.logger.warn(`System message audit failed: ${(e as Error).message}`);
    }

    return sent;
  }

  private normalizePhone(value: string): string {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('0') && digits.length >= 11) return '9' + digits;
    if (digits.startsWith('90')) return digits;
    if (digits.length === 10) return '90' + digits;
    return digits;
  }

  private phoneVariants(phone: string): string[] {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return [];
    const set = new Set<string>([digits]);
    if (digits.startsWith('90') && digits.length > 10) {
      set.add('0' + digits.slice(2));
      set.add(digits.slice(2));
    } else if (digits.startsWith('0') && digits.length >= 11) {
      set.add('9' + digits);
      set.add(digits.slice(1));
    } else if (digits.length === 10) {
      set.add('90' + digits);
      set.add('0' + digits);
    }
    return Array.from(set);
  }

  /** Son 15 dk içinde aktif (yeni) bir konuşma var mı? Varsa hatırlatma gönderme. */
  private async hasRecentActiveConversation(
    tenantId: string,
    phone: string,
    excludeSessionId?: string,
  ): Promise<boolean> {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return false;
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    let query = this.supabase.db
      .from('conversation_sessions')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('phone', this.phoneVariants(digits))
      .eq('status', 'active')
      .gte('updated_at', cutoff)
      .limit(1);
    if (excludeSessionId) query = query.neq('id', excludeSessionId);
    const { data } = await query;
    return !!(data && data.length > 0);
  }

  private async logCampaign(tenantId: string, type: string, customerId: string, message: string, phone?: string, channel: 'sms' | 'whatsapp' | 'instagram' = 'whatsapp') {
    const targetPhone = phone || customerId;

    // İYS: pazarlama amaçlı gönderimlerde izin kontrolü (opt-out / NetİYS)
    if (PROMOTIONAL_TYPES.includes(type) && targetPhone && targetPhone.startsWith('05')) {
      try {
        const consent = await this.iys.checkConsent(tenantId, targetPhone);
        if (consent.consent === 'ret') {
          await this.supabase.db.from('campaign_logs').insert({
            tenant_id: tenantId,
            type,
            customer_id: customerId,
            status: 'skipped_iys',
            message,
            error_message: 'İYS izni yok',
            sent_at: new Date().toISOString(),
          });
          this.logger.log(`[Campaign] İYS opt-out — ${type} skipped for ${targetPhone}`);
          return;
        }
      } catch (err) {
        this.logger.warn(`[Campaign] İYS kontrolü başarısız (atlandı): ${(err as Error).message}`);
      }
    }

    let status = 'sent';
    let errorMsg = '';

    // Instagram DM
    if (targetPhone && targetPhone.startsWith('ig-')) {
      try {
        await this.instagram.sendMessage(targetPhone.replace('ig-', ''), tenantId, message);
      } catch (e) {
        status = 'failed';
        errorMsg = String(e);
      }
      await this.supabase.db.from('campaign_logs').insert({
        tenant_id: tenantId,
        type,
        customer_id: customerId,
        status,
        message,
        error_message: errorMsg || null,
        sent_at: new Date().toISOString(),
      });
      return;
    }

    if (targetPhone && targetPhone.startsWith('05')) {
      if (channel === 'sms') {
        try {
          const res = await this.outbound.send({
            tenantId,
            channel: 'sms',
            to: targetPhone,
            body: message,
            customerId,
          });
          if (!res.success) {
            status = 'failed';
            errorMsg = res.error || '';
          }
          this.logger.log(`[Campaign] SMS to ${targetPhone}: ${res.success ? 'sent' : res.error}`);
        } catch (e) {
          status = 'failed';
          errorMsg = String(e);
        }
      } else {
        try {
          const convId = await this.whatsapp.findOrCreate(tenantId, targetPhone);
          await this.whatsapp.addMessage({
            tenantId,
            conversationId: convId,
            direction: 'outgoing',
            body: message,
          });
          this.logger.log(`[Campaign] WhatsApp sent to ${targetPhone}: ${message.substring(0, 50)}...`);
        } catch (e) {
          status = 'failed';
          errorMsg = String(e);
          this.logger.error(`[Campaign] WhatsApp send failed for ${targetPhone}: ${e}`);
        }
      }
    } else {
      this.logger.log(`[Campaign] No valid phone, logged only: ${message.substring(0, 50)}...`);
    }

    await this.supabase.db.from('campaign_logs').insert({
      tenant_id: tenantId,
      type,
      customer_id: customerId,
      status,
      message,
      error_message: errorMsg || null,
      sent_at: new Date().toISOString(),
    });
  }

  /**
   * Panelden tek seferlik toplu gönderim (SMS / WhatsApp).
   * Önce İYS filtresinden geçirir, sonra drip (200ms aralıklarla) gönderir.
   */
  async bulkSend(tenantId: string, input: { message: string; channel?: 'sms' | 'whatsapp'; maxCustomers?: number }) {
    const { message, channel = 'sms', maxCustomers = 500 } = input;
    if (!message || !message.trim()) throw new Error('Mesaj boş olamaz');

    const { data: customers } = await this.supabase.db
      .from('customers')
      .select('id, name, phone')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    const withPhone = (customers || []).filter((c: any) => c.phone && c.phone.startsWith('05')) as { id: string; name: string; phone: string }[];

    // İYS izni olanları seç
    const allowedPhones = await this.iys.filterMarketingAllowed(tenantId, withPhone.map((c) => c.phone));
    const allowed = withPhone.filter((c) => allowedPhones.includes(c.phone)).slice(0, maxCustomers);

    let sent = 0;
    let failed = 0;
    for (const c of allowed) {
      const msg = message.replace('{name}', c.name || 'Değerli Müşterimiz');
      try {
        if (channel === 'whatsapp') {
          const convId = await this.whatsapp.findOrCreate(tenantId, c.phone);
          await this.whatsapp.addMessage({ tenantId, conversationId: convId, direction: 'outgoing', body: msg });
          await this.supabase.db.from('campaign_logs').insert({
            tenant_id: tenantId, type: 'bulk', customer_id: c.id, status: 'sent', message: msg, sent_at: new Date().toISOString(),
          });
        } else {
          const res = await this.outbound.send({ tenantId, channel: 'sms', to: c.phone, body: msg, customerId: c.id });
          if (!res.success) {
            await this.supabase.db.from('campaign_logs').insert({
              tenant_id: tenantId, type: 'bulk', customer_id: c.id, status: 'failed', message: msg, error_message: res.error || '', sent_at: new Date().toISOString(),
            });
            failed++;
            continue;
          }
          await this.supabase.db.from('campaign_logs').insert({
            tenant_id: tenantId, type: 'bulk', customer_id: c.id, status: 'sent', message: msg, sent_at: new Date().toISOString(),
          });
        }
        sent++;
      } catch (err) {
        failed++;
        this.logger.error(`[Bulk] send failed for ${c.phone}: ${(err as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    this.logger.log(`[Bulk] Tenant ${tenantId}: total=${withPhone.length} allowed=${allowed.length} sent=${sent} failed=${failed} (iys filtered=${withPhone.length - allowed.length})`);
    return {
      total: withPhone.length,
      iys_blocked: withPhone.length - allowed.length,
      sent,
      failed,
      channel,
    };
  }

  // --- REST API methods ---

  async listCampaigns(tenantId: string) {
    const { data } = await this.supabase.db
      .from('sales_campaigns')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    return data || [];
  }

  async createCampaign(tenantId: string, body: Record<string, unknown>) {
    const { data, error } = await this.supabase.db
      .from('sales_campaigns')
      .insert({ tenant_id: tenantId, ...body })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateCampaign(id: string, body: Record<string, unknown>) {
    const { data, error } = await this.supabase.db
      .from('sales_campaigns')
      .update(body)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteCampaign(id: string) {
    await this.supabase.db.from('sales_campaigns').delete().eq('id', id);
    return { success: true };
  }

  async getStats(tenantId: string) {
    const [total, sent, reorder, holiday, birthday, abandoned_cart] = await Promise.all([
      this.countLogs(tenantId),
      this.countLogs(tenantId, 'sent'),
      this.countLogs(tenantId, 'sent', 'reorder'),
      this.countLogs(tenantId, 'sent', 'holiday'),
      this.countLogs(tenantId, 'sent', 'birthday'),
      this.countLogs(tenantId, 'sent', 'abandoned_cart'),
    ]);
    return { total, sent, reorder, holiday, birthday, abandoned_cart };
  }

  @Cron('*/15 * * * *') // every 15 minutes
  async checkUnshippedReminders() {
    this.logger.log('Unshipped cargo reminder check started');
    try {
      const { data: tenants } = await this.supabase.db
        .from('tenant_settings')
        .select('tenant_id, shipping_reminder_hours');

      for (const t of tenants || []) {
        const tid = (t as any).tenant_id;
        const hours = (t as any).shipping_reminder_hours || 6;
        const cutoff = new Date(Date.now() - hours * 3600000).toISOString();

        // Find orders stuck in non-shipped status older than cutoff
        const { data: stuckOrders } = await this.supabase.db
          .from('orders')
          .select('id, order_number, customer_name, status, channel, source, customer_note, created_at')
          .eq('tenant_id', tid)
          .eq('status', 'PACKAGED')
          .lt('created_at', cutoff)
          .limit(20);

        if (!stuckOrders || stuckOrders.length === 0) continue;

        for (const order of stuckOrders) {
          const exists = await this.countLogs(tid, 'cargo_reminder_sent', 'system');
          // Log reminder to activity
          await this.supabase.db.from('activity_logs').insert({
            tenant_id: tid,
            entity_type: 'order',
            entity_id: (order as any).id,
            event_type: 'CARGO_REMINDER',
            description: `⏰ ${(order as any).customer_name || 'Müşteri'} — #${(order as any).order_number} kargo bilgisi ${hours} saattir girilmedi!`,
            metadata: { hours, order_id: (order as any).id },
            actor_type: 'SYSTEM',
            created_at: new Date().toISOString(),
          });

          this.logger.log(`Cargo reminder for #${(order as any).order_number}`);
        }
      }
    } catch (err) {
      this.logger.error(`Cargo reminder error: ${(err as Error).message}`);
    }
  }

  private async countLogs(tenantId: string, status?: string, type?: string) {
    try {
      let query = this.supabase.db.from('campaign_logs').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId);
      if (status) query = query.eq('status', status);
      if (type) query = query.eq('type', type);
      const { count } = await query;
      return count || 0;
    } catch { return 0; }
  }
}
