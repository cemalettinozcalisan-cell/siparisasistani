import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../common/supabase.client';

@Injectable()
export class KvkkService {
  private readonly logger = new Logger(KvkkService.name);

  constructor(private readonly supabase: SupabaseService) {}

  // Daily cleanup at 03:00
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async autoCleanup() {
    this.logger.log('KVKK auto-cleanup started');

    try {
      const { data: tenants } = await this.supabase.db
        .from('tenant_settings')
        .select('tenant_id, recording_retention_days, audit_log_retention_days, auto_cleanup_enabled');

      for (const t of tenants || []) {
        if (!(t as any).auto_cleanup_enabled) continue;

        const tid = (t as any).tenant_id;
        const recordDays = (t as any).recording_retention_days || 90;
        const auditDays = (t as any).audit_log_retention_days || 365;
        const cutoffRecord = new Date(Date.now() - recordDays * 86400000).toISOString();
        const cutoffAudit = new Date(Date.now() - auditDays * 86400000).toISOString();

        // Delete old recordings
        const { data: delRec } = await this.supabase.db
          .from('call_recordings')
          .delete()
          .eq('tenant_id', tid)
          .lt('created_at', cutoffRecord);
        if (delRec) this.logger.log(`Tenant ${tid}: deleted ${(delRec as any[]).length} old recordings`);

        // Delete old audit logs
        const { data: delAudit } = await this.supabase.db
          .from('ai_audit_logs')
          .delete()
          .eq('tenant_id', tid)
          .lt('created_at', cutoffAudit);
        if (delAudit) this.logger.log(`Tenant ${tid}: deleted ${(delAudit as any[]).length} old audit logs`);

        // Delete old activity logs
        const { data: delAct } = await this.supabase.db
          .from('activity_logs')
          .delete()
          .eq('tenant_id', tid)
          .lt('created_at', cutoffAudit);
        if (delAct) this.logger.log(`Tenant ${tid}: deleted ${(delAct as any[]).length} old activity logs`);
      }
    } catch (e) {
      this.logger.error(`KVKK cleanup failed: ${e}`);
    }
  }

  async eraseCustomerData(tenantId: string, customerId: string) {
    // Anonymize customer data per KVKK article 7 (right to be forgotten)
    const { error } = await this.supabase.db
      .from('customers')
      .update({
        name: '[Silinmiş Kullanıcı]',
        phone: `SILINDI-${customerId.slice(0, 8)}`,
        city: null,
        address: null,
        deleted_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', customerId);

    if (error) throw new Error(`Customer erase failed: ${error.message}`);

    // Anonymize order records (keep data for analytics but remove PII)
    await this.supabase.db
      .from('orders')
      .update({ customer_id: null, notes: null })
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId);

    // Anonymize conversation records
    await this.supabase.db
      .from('conversation_sessions')
      .update({ phone: `SILINDI-${customerId.slice(0, 8)}`, messages: null, session_data: null })
      .eq('tenant_id', tenantId)
      .eq('phone', `%SILINDI-%`);

    return { status: 'erased', customerId };
  }

  async exportCustomerData(tenantId: string, customerId: string) {
    const { data: customer } = await this.supabase.db
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', customerId)
      .single();

    if (!customer) return { error: 'Customer not found' };

    const { data: orders } = await this.supabase.db
      .from('orders')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId);

    const { data: conversations } = await this.supabase.db
      .from('conversation_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('phone', (customer as any).phone);

    return {
      exported_at: new Date().toISOString(),
      customer,
      orders: orders || [],
      conversations: (conversations || []).map((c: Record<string, unknown>) => ({
        id: c.id,
        channel: c.channel,
        status: c.status,
        created_at: c.created_at,
      })),
    };
  }
}
