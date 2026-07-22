import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { EventBusService, SystemEvents } from '../event-bus/event-bus.service';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(params: {
    tenantId: string;
    orderId: string;
    company: string;
    trackingNo: string;
  }) {
    const trackingUrl = this.buildTrackingUrl(params.company, params.trackingNo);

    const { data, error } = await this.supabase.db
      .from('shipments')
      .insert({
        tenant_id: params.tenantId,
        order_id: params.orderId,
        company: params.company,
        tracking_no: params.trackingNo,
        tracking_url: trackingUrl,
        status: 'shipped',
        shipped_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Shipment creation failed: ${error.message}`);
      throw new Error(`Shipment creation failed: ${error.message}`);
    }

    this.eventBus.emit(SystemEvents.ORDER_SHIPPED, params.tenantId, {
      entityType: 'shipment',
      orderId: params.orderId,
      company: params.company,
      trackingNo: params.trackingNo,
      trackingUrl,
      description: `Kargo oluşturuldu: ${params.company} - ${params.trackingNo}`,
    }, params.orderId);

    return data;
  }

  async getByOrder(orderId: string) {
    const { data } = await this.supabase.db
      .from('shipments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    return data || [];
  }

  private buildTrackingUrl(company: string, trackingNo: string): string {
    const urls: Record<string, string> = {
      yurtici: `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${trackingNo}`,
      mng: `https://www.mngkargo.com.tr/goruntuleme/sorgu?code=${trackingNo}`,
      aras: `https://www.araskargo.com.tr/tr/Takip?q=${trackingNo}`,
    };

    return urls[company.toLowerCase()] || '';
  }
}
