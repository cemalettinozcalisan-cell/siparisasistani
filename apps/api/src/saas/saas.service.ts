import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../common/supabase.client';
import * as crypto from 'crypto';

@Injectable()
export class SaasService {
  private readonly logger = new Logger(SaasService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getPlans() {
    const { data } = await this.supabase.db
      .from('subscription_plans')
      .select('*')
      .eq('active', true)
      .order('sort_order');
    return data || [];
  }

  async getAddonPacks() {
    const { data } = await this.supabase.db
      .from('addon_packs')
      .select('*')
      .eq('active', true)
      .order('price');
    return data || [];
  }

  async getSubscription(tenantId: string) {
    const { data: sub } = await this.supabase.db
      .from('subscriptions')
      .select('*, plan:plan_id(*)')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!sub) {
      // Create default subscription
      const { data: plan } = await this.supabase.db
        .from('subscription_plans')
        .select('*')
        .eq('code', 'starter')
        .single();

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const { data: newSub } = await this.supabase.db
        .from('subscriptions')
        .insert({
          tenant_id: tenantId,
          plan_id: plan.id,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: endDate.toISOString(),
          order_limit: plan.order_limit,
          orders_used: 0,
          auto_renew: true,
        })
        .select('*, plan:plan_id(*)')
        .single();

      return newSub;
    }

    // Update usage count
    const { count } = await this.supabase.db
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', sub.current_period_start);

    sub.orders_used = count || 0;

    return sub;
  }

  async getInvoices(tenantId: string) {
    const { data } = await this.supabase.db
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(24);
    return data || [];
  }

  async getUsage(tenantId: string) {
    const sub = await this.getSubscription(tenantId);
    const planCode = sub.plan?.code || 'starter';
    const planOrderLimit = sub.plan?.order_limit;
    // Fallback: if plan order_limit is missing/stale, derive from plan code
    const LIMIT_BY_CODE: Record<string, number> = { starter: 150, pro: 250, ultra: 400, mega: 600, premium: 900 };
    const orderLimit = planOrderLimit || LIMIT_BY_CODE[planCode] || 150;
    const usagePercent = orderLimit > 0 ? Math.min(100, Math.round((sub.orders_used / orderLimit) * 100)) : 0;
    const overflowCount = Math.max(0, (sub.orders_used || 0) - orderLimit);
    const overflowCost = overflowCount * 80;
    const maxOverflow = Math.round(orderLimit * 0.5);

    return {
      planName: sub.plan?.name || 'Starter',
      planCode: sub.plan?.code || 'starter',
      ordersUsed: sub.orders_used,
      orderLimit,
      usagePercent,
      remaining: Math.max(0, orderLimit - sub.orders_used),
      overflowCount,
      overflowCost,
      maxOverflow,
      status: sub.status,
      autoRenew: sub.auto_renew,
      autoTopup: sub.auto_topup,
      periodEnd: sub.current_period_end,
    };
  }

  async upgradePlan(tenantId: string, planCode: string, billingCycle: string = 'monthly') {
    const { data: plan } = await this.supabase.db
      .from('subscription_plans')
      .select('*')
      .eq('code', planCode)
      .single();

    if (!plan) throw new Error('Plan not found');

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const isAnnual = billingCycle === 'annual';
    const baseAmount = isAnnual ? Math.round(plan.price_monthly * 12 * 0.9) : plan.price_monthly;
    const amountWithKdv = Math.round(baseAmount * 1.20);

    const invNumber = `INV-${Date.now()}`;
    await this.supabase.db.from('invoices').insert({
      tenant_id: tenantId,
      invoice_number: invNumber,
      description: `${plan.name} ${isAnnual ? 'Yıllık Peşin (%10 İndirim)' : 'Aylık'} Paket`,
      amount: amountWithKdv,
      status: 'pending',
      payment_method: 'system',
    });

    const { data: sub } = await this.supabase.db
      .from('subscriptions')
      .update({
        plan_id: plan.id,
        order_limit: plan.order_limit,
        current_period_start: new Date().toISOString(),
        current_period_end: endDate.toISOString(),
        orders_used: 0,
      })
      .eq('tenant_id', tenantId)
      .select('*, plan:plan_id(*)')
      .single();

    return sub;
  }

  async purchaseAddon(tenantId: string, packCode: string) {
    const { data: pack } = await this.supabase.db
      .from('addon_packs')
      .select('*')
      .eq('code', packCode)
      .single();

    if (!pack) throw new Error('Pack not found');

    const amountWithKdv = Math.round(pack.price * 1.20);

    const invNumber = `INV-${Date.now()}`;
    await this.supabase.db.from('invoices').insert({
      tenant_id: tenantId,
      invoice_number: invNumber,
      description: `${pack.name} Ek Paket`,
      amount: amountWithKdv,
      status: 'pending',
      payment_method: 'system',
    });

    const { data: sub } = await this.supabase.db
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    await this.supabase.db
      .from('subscriptions')
      .update({ order_limit: (sub?.order_limit || 0) + pack.order_credit })
      .eq('tenant_id', tenantId);

    return { invoice: invNumber, pack: pack.name, addedCredits: pack.order_credit };
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async monthlyBilling() {
    this.logger.log('Monthly billing cycle started');

    const { data: subs } = await this.supabase.db
      .from('subscriptions')
      .select('*, plan:plan_id(*)')
      .eq('status', 'active');

    for (const sub of subs || []) {
      try {
        const ordersUsed = sub.orders_used || 0;
        const planCode = sub.plan?.code || 'starter';
        const LIMIT_BY_CODE: Record<string, number> = { starter: 150, pro: 250, ultra: 400, mega: 600, premium: 900 };
        const orderLimit = sub.plan?.order_limit || LIMIT_BY_CODE[planCode] || 150;
        const overflowCount = Math.max(0, ordersUsed - orderLimit);
        const overflowCost = overflowCount * 80;
        const planPrice = sub.plan?.price_monthly || 0;

        // Invoice: plan + overflow + 20% KDV
        const subtotal = planPrice + overflowCost;
        const amountWithKdv = Math.round(subtotal * 1.20);

        const invNumber = `INV-${Date.now()}-${sub.tenant_id?.toString().slice(0, 8)}`;
        let description = `${sub.plan?.name || 'Plan'} Aylık Fatura`;
        if (overflowCount > 0) {
          description += ` + ${overflowCount} Aşım Sipariş (${overflowCost} TL)`;
        }

        await this.supabase.db.from('invoices').insert({
          tenant_id: sub.tenant_id,
          invoice_number: invNumber,
          description,
          amount: amountWithKdv,
          status: 'pending',
          payment_method: 'system',
        });

        // Reset orders_used for new month
        await this.supabase.db
          .from('subscriptions')
          .update({ orders_used: 0 })
          .eq('id', sub.id);

        this.logger.log(`Billed tenant ${sub.tenant_id}: ${subtotal} TL + KDV = ${amountWithKdv} TL (overflow: ${overflowCount})`);
      } catch (e) {
        this.logger.error(`Billing failed for tenant ${sub.tenant_id}: ${e}`);
      }
    }
  }
}
