import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Injectable()
export class PrintQueueService {
  private readonly logger = new Logger(PrintQueueService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async enqueue(tenantId: string, orderId: string): Promise<void> {
    const { error } = await this.supabase.db.from('print_jobs').insert({
      tenant_id: tenantId,
      order_id: orderId,
      status: 'pending',
      retry_count: 0,
      max_retries: 3,
    });

    if (error) {
      this.logger.error(`Print enqueue failed: ${error.message}`);
    }
  }

  async getPending(tenantId: string) {
    const { data } = await this.supabase.db
      .from('print_jobs')
      .select(`
        id, retry_count, created_at,
        order:order_id (order_number, total_price, status)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    return data || [];
  }

  async markPrinted(jobId: string): Promise<void> {
    await this.supabase.db
      .from('print_jobs')
      .update({
        status: 'printed',
        printed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  async markFailed(jobId: string, errorMessage: string): Promise<void> {
    await this.supabase.db.rpc('increment_retry', { job_id: jobId });

    const { data } = await this.supabase.db
      .from('print_jobs')
      .select('retry_count, max_retries')
      .eq('id', jobId)
      .single();

    if (data && data.retry_count >= data.max_retries) {
      await this.supabase.db
        .from('print_jobs')
        .update({ status: 'failed', error_message: errorMessage })
        .eq('id', jobId);
    } else {
      await this.supabase.db
        .from('print_jobs')
        .update({ status: 'pending', error_message: errorMessage })
        .eq('id', jobId);
    }
  }
}
