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

        // Delete old recordings (kısa retention — ses kaydı)
        const { data: delRec, error: errRec } = await this.supabase.db
          .from('call_recordings')
          .delete()
          .select('id')
          .eq('tenant_id', tid)
          .lt('created_at', cutoffRecord);
        const recCount = (delRec as unknown as any[])?.length || 0;

        // Delete old audit logs (AI denetim — ayrı retention)
        const { data: delAudit, error: errAudit } = await this.supabase.db
          .from('ai_audit_logs')
          .delete()
          .select('id')
          .eq('tenant_id', tid)
          .lt('created_at', cutoffAudit);
        const auditCount = (delAudit as unknown as any[])?.length || 0;

        // Delete old activity logs (transcript/metadata — ayrı retention)
        const { data: delAct, error: errAct } = await this.supabase.db
          .from('activity_logs')
          .delete()
          .select('id')
          .eq('tenant_id', tid)
          .lt('created_at', cutoffAudit);
        const actCount = (delAct as unknown as any[])?.length || 0;

        if (recCount || auditCount || actCount || errRec || errAudit || errAct) {
          this.logger.log(`Tenant ${tid}: recordings=${recCount}, audit=${auditCount}, activity=${actCount}`);
        }

        // Retention Monitor — işlem sonucunu logla
        await this.logRetention(tid, 'recording', recCount, errRec ? 1 : 0, cutoffRecord, errRec?.message);
        await this.logRetention(tid, 'audit_log', auditCount, errAudit ? 1 : 0, cutoffAudit, errAudit?.message);
        await this.logRetention(tid, 'activity_log', actCount, errAct ? 1 : 0, cutoffAudit, errAct?.message);
      }
    } catch (e) {
      this.logger.error(`KVKK cleanup failed: ${e}`);
      await this.logRetention(null, 'global', 0, 1, null, `Cleanup hatası: ${e}`);
    }
  }

  private async logRetention(
    tenantId: string | null,
    scope: string,
    deletedCount: number,
    failedCount: number,
    cutoff: string | null,
    message?: string,
  ) {
    try {
      await this.supabase.db.from('retention_logs').insert({
        tenant_id: tenantId || null,
        scope,
        deleted_count: deletedCount,
        failed_count: failedCount,
        cutoff: cutoff || null,
        message: message || null,
      });
    } catch (e) {
      this.logger.error(`retention log insert failed: ${e}`);
    }
  }

  /** Retention Monitor özeti — son çalıştırmalar ve toplam silinen kayıt. */
  async retentionOverview(tenantId?: string) {
    let q = this.supabase.db.from('retention_logs').select('*').order('ran_at', { ascending: false }).limit(50);
    if (tenantId) q = q.eq('tenant_id', tenantId);

    const { data: logs } = await q;

    const total = (logs || []).reduce((s: number, l: Record<string, unknown>) => s + Number(l.deleted_count || 0), 0);
    const failed = (logs || []).reduce((s: number, l: Record<string, unknown>) => s + Number(l.failed_count || 0), 0);

    return {
      total_deleted: total,
      total_failed: failed,
      last_run: (logs || [])[0]?.ran_at || null,
      logs: logs || [],
    };
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
