import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Injectable()
export class QueueMonitorService {
  private readonly logger = new Logger(QueueMonitorService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getQueueStats(tenantId?: string) {
    const filter = tenantId ? (q: any) => q.eq('tenant_id', tenantId) : (q: any) => q;

    const [pending, processing, failed, completed, recent] = await Promise.all([
      this.count(filter, 'print_jobs', 'pending'),
      this.count(filter, 'print_jobs', 'processing'),
      this.count(filter, 'print_jobs', 'failed'),
      this.count(filter, 'print_jobs', 'printed'),
      this.getRecent(filter, 'print_jobs', 10),
    ]);

    return {
      summary: { pending, processing, failed, completed },
      recent,
    };
  }

  private async count(filter: (q: any) => any, table: string, status: string) {
    try {
      let query = this.supabase.db.from(table).select('id', { count: 'exact', head: true }).eq('status', status);
      query = filter(query);
      const { count } = await query;
      return count || 0;
    } catch { return 0; }
  }

  private async getRecent(filter: (q: any) => any, table: string, limit: number) {
    try {
      let query = this.supabase.db
        .from(table)
        .select('id, status, retry_count, error_message, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      query = filter(query);
      const { data } = await query;
      return data || [];
    } catch { return []; }
  }
}
