import { Controller, Get, Param } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Controller('license')
export class LicenseController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get(':tenantId')
  async getLicense(@Param('tenantId') tenantId: string) {
    const { count: orderCount } = await this.supabase.db
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const limits = [250, 500, 1000];
    const limit = limits[1]; // Default to 500 for demo

    return {
      plan: 'Pro',
      used: orderCount || 0,
      limit,
      remaining: Math.max(0, limit - (orderCount || 0)),
      usagePercent: Math.min(100, Math.round(((orderCount || 0) / limit) * 100)),
      features: ['AI Sipariş Alma', 'WhatsApp Entegrasyonu', 'CRM', 'Raporlar', 'Kampanyalar'],
    };
  }
}
