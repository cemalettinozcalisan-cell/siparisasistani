import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Injectable()
export class OrderLockService {
  private readonly logger = new Logger(OrderLockService.name);
  private lockDurationMs = 5 * 60 * 1000; // 5 dakika

  constructor(private readonly supabase: SupabaseService) {}

  async acquire(orderId: string, userId: string, userName: string): Promise<{ locked: boolean; lockedBy?: string }> {
    await this.releaseExpired();

    const { data: existing } = await this.supabase.db
      .from('order_locks')
      .select('user_name')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existing) {
      return { locked: false, lockedBy: existing.user_name };
    }

    const expiresAt = new Date(Date.now() + this.lockDurationMs).toISOString();

    const { error } = await this.supabase.db
      .from('order_locks')
      .insert({ order_id: orderId, user_id: userId, user_name: userName, expires_at: expiresAt });

    if (error) {
      this.logger.error(`Lock acquire failed: ${error.message}`);
      return { locked: false };
    }

    return { locked: true };
  }

  async release(orderId: string): Promise<void> {
    await this.supabase.db.from('order_locks').delete().eq('order_id', orderId);
  }

  async getLock(orderId: string): Promise<{ locked: boolean; userName?: string; expiresAt?: string }> {
    await this.releaseExpired();

    const { data } = await this.supabase.db
      .from('order_locks')
      .select('user_name, expires_at')
      .eq('order_id', orderId)
      .maybeSingle();

    if (!data) return { locked: false };
    return { locked: true, userName: data.user_name, expiresAt: data.expires_at };
  }

  private async releaseExpired(): Promise<void> {
    await this.supabase.db
      .from('order_locks')
      .delete()
      .lt('expires_at', new Date().toISOString());
  }
}
