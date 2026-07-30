import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../common/supabase.client';
import { WhatsAppConversationsService } from '../whatsapp/conversations/conversations.service';
import { InstagramService } from '../instagram/instagram.service';

@Injectable()
export class SalesEngineService {
  private readonly logger = new Logger(SalesEngineService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly whatsapp: WhatsAppConversationsService,
    private readonly instagram: InstagramService,
  ) {}

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
        .select('tenant_id, sales_automation_enabled, reorder_reminder_days, birthday_reminder_enabled, holiday_campaigns_enabled')
        .eq('sales_automation_enabled', true);

      for (const t of tenants || []) {
        const tid = (t as any).tenant_id;

        if ((t as any).reorder_reminder_days > 0) {
          await this.processReorderReminders(tid, (t as any).reorder_reminder_days);
        }
        if ((t as any).birthday_reminder_enabled) {
          await this.processBirthdayReminders(tid);
        }
        if ((t as any).holiday_campaigns_enabled) {
          await this.processHolidayCampaigns(tid);
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

  private async processBirthdayReminders(tenantId: string) {
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const { data: customers } = await this.supabase.db
      .from('customers')
      .select('id, name, phone')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);
    // Birthday detection would need a birthday field on customers - for now use a sample
    // In production, customers would have a birth_date column

    this.logger.log(`[Birthday] Tenant ${tenantId}: Checked for ${monthDay}`);
  }

  private async processHolidayCampaigns(tenantId: string) {
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

        await this.logCampaign(tenantId, 'holiday', (c as any).id, message, (c as any).phone);
      }
      this.logger.log(`[Campaign] Tenant ${tenantId}: Campaign ${(campaign as any).name} processed for ${customers?.length || 0} customers`);
    }
  }

  private async processAbandonedCarts(tenantId: string, cutoff: string) {
    // Find abandoned conversations across all channels (phone, whatsapp, instagram)
    const { data: sessions } = await this.supabase.db
      .from('conversation_sessions')
      .select('id, phone, channel, status, session_label, session_data, created_at')
      .eq('tenant_id', tenantId)
      .neq('status', 'completed')
      .neq('status', 'closed')
      .lt('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(50);

    if (!sessions || sessions.length === 0) return;

    for (const s of sessions || []) {
      const phone = (s as any).phone as string;
      if (!phone) continue;

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

  private async logCampaign(tenantId: string, type: string, customerId: string, message: string, phone?: string) {
    let status = 'sent';
    let errorMsg = '';

    // Try to send via WhatsApp if phone number is available
    const targetPhone = phone || customerId;
    if (targetPhone && targetPhone.startsWith('05')) {
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
    } else {
      this.logger.log(`[Campaign] No valid phone, logged only: ${message.substring(0, 50)}...`);
    }

    // Try Instagram DM if type is instagram-related or phone starts with IG prefix
    if (targetPhone && targetPhone.startsWith('ig-')) {
      try {
        await this.instagram.sendMessage(targetPhone.replace('ig-', ''), tenantId, message);
      } catch {}
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
