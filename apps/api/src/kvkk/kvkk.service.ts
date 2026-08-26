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
        .select(
          'tenant_id, recording_retention_days, audit_log_retention_days, transcript_retention_days, message_retention_days, activity_log_retention_days, auto_cleanup_enabled',
        );

      for (const t of tenants || []) {
        if (!(t as any).auto_cleanup_enabled) continue;

        const tid = (t as any).tenant_id;
        const recordDays = (t as any).recording_retention_days || 90;
        const auditDays = (t as any).audit_log_retention_days || 3650;
        const transcriptDays = (t as any).transcript_retention_days || 3650;
        const messageDays = (t as any).message_retention_days || 3650;
        const activityDays = (t as any).activity_log_retention_days || 1825;

        const cutoffRecord = new Date(Date.now() - recordDays * 86400000).toISOString();
        const cutoffAudit = new Date(Date.now() - auditDays * 86400000).toISOString();
        const cutoffTranscript = new Date(Date.now() - transcriptDays * 86400000).toISOString();
        const cutoffMessage = new Date(Date.now() - messageDays * 86400000).toISOString();
        const cutoffActivity = new Date(Date.now() - activityDays * 86400000).toISOString();

        // Ses kaydı (kısa retention — varsayılan 90, esnaf 30 seçebilir)
        const { data: delRec, error: errRec } = await this.supabase.db
          .from('call_recordings')
          .delete()
          .select('id')
          .eq('tenant_id', tid)
          .lt('created_at', cutoffRecord);
        const recCount = (delRec as unknown as any[])?.length || 0;

        // AI denetim (10 yıl)
        const { data: delAudit, error: errAudit } = await this.supabase.db
          .from('ai_audit_logs')
          .delete()
          .select('id')
          .eq('tenant_id', tid)
          .lt('created_at', cutoffAudit);
        const auditCount = (delAudit as unknown as any[])?.length || 0;

        // Transcript (conversation_sessions içerik — 10 yıl, sonra içerik silinir)
        const { data: delTr, error: errTr } = await this.supabase.db
          .from('conversation_sessions')
          .update({ messages: null, session_data: null, transcript: null })
          .select('id')
          .eq('tenant_id', tid)
          .lt('created_at', cutoffTranscript);
        const trCount = (delTr as unknown as any[])?.length || 0;

        // WhatsApp mesajları (10 yıl)
        const { data: delWa, error: errWa } = await this.supabase.db
          .from('whatsapp_messages')
          .delete()
          .select('id')
          .eq('tenant_id', tid)
          .lt('created_at', cutoffMessage);
        const waCount = (delWa as unknown as any[])?.length || 0;

        // Instagram mesajları (10 yıl)
        const { data: delIg, error: errIg } = await this.supabase.db
          .from('instagram_messages')
          .delete()
          .select('id')
          .eq('tenant_id', tid)
          .lt('created_at', cutoffMessage);
        const igCount = (delIg as unknown as any[])?.length || 0;

        // Aktivite/olay kaydı (5 yıl)
        const { data: delAct, error: errAct } = await this.supabase.db
          .from('activity_logs')
          .delete()
          .select('id')
          .eq('tenant_id', tid)
          .lt('created_at', cutoffActivity);
        const actCount = (delAct as unknown as any[])?.length || 0;

        if (recCount || auditCount || trCount || waCount || igCount || actCount) {
          this.logger.log(`Tenant ${tid}: rec=${recCount}, audit=${auditCount}, transcript=${trCount}, wa=${waCount}, ig=${igCount}, activity=${actCount}`);
        }

        await this.logRetention(tid, 'recording', recCount, errRec ? 1 : 0, cutoffRecord, errRec?.message);
        await this.logRetention(tid, 'audit_log', auditCount, errAudit ? 1 : 0, cutoffAudit, errAudit?.message);
        await this.logRetention(tid, 'transcript', trCount, errTr ? 1 : 0, cutoffTranscript, errTr?.message);
        await this.logRetention(tid, 'whatsapp', waCount, errWa ? 1 : 0, cutoffMessage, errWa?.message);
        await this.logRetention(tid, 'instagram', igCount, errIg ? 1 : 0, cutoffMessage, errIg?.message);
        await this.logRetention(tid, 'activity_log', actCount, errAct ? 1 : 0, cutoffActivity, errAct?.message);
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
