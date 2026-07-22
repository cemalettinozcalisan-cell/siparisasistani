import { Controller, Get, Param } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Controller('replay')
export class ReplayController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get('order/:orderId')
  async getOrderReplay(@Param('orderId') orderId: string) {
    const [order, aiEvents, logs] = await Promise.all([
      this.supabase.db.from('orders').select('*, customer:customer_id(name, phone)').eq('id', orderId).single(),
      this.supabase.db.from('ai_events').select('*').eq('order_id', orderId).order('created_at'),
      this.supabase.db.from('activity_logs').select('*').eq('entity_id', orderId).order('created_at'),
    ]);

    return { order: order.data, aiEvents: aiEvents.data || [], timeline: logs.data || [] };
  }

  @Get('conversation/:orderId')
  async getConversation(@Param('orderId') orderId: string) {
    const { data: order } = await this.supabase.db
      .from('orders')
      .select('id, order_number, ai_transcript, ai_confidence, customer_note, created_at')
      .eq('id', orderId)
      .single();

    if (!order) return { error: 'Order not found' };

    const { data: audits } = await this.supabase.db
      .from('ai_audit_logs')
      .select('*')
      .eq('tenant_id', (await this.supabase.db.from('orders').select('tenant_id').eq('id', orderId).single()).data?.tenant_id)
      .order('created_at', { ascending: true })
      .limit(20);

    const transcript = order.ai_transcript
      ? order.ai_transcript.split('\n').map((line: string) => {
          const [role, ...msg] = line.split(':');
          return { role: role.trim().toLowerCase(), content: msg.join(':').trim() };
        })
      : [];

    return {
      order,
      transcript,
      audits: audits || [],
    };
  }
}
