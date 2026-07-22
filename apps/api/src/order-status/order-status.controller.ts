import { Controller, Post, Body } from '@nestjs/common';
import { OrderStatusService } from './order-status.service';

@Controller('orders')
export class OrderStatusController {
  constructor(private readonly status: OrderStatusService) {}

  @Post('status')
  async updateStatus(@Body() body: {
    tenantId: string; orderId: string; status: string;
    cargoCompany?: string; trackingNo?: string;
  }) {
    const trackingUrl = body.cargoCompany && body.trackingNo
      ? this.buildTrackingUrl(body.cargoCompany, body.trackingNo) : undefined;
    return this.status.updateStatus({ ...body, newStatus: body.status, trackingUrl });
  }

  private buildTrackingUrl(company: string, trackingNo: string): string {
    const urls: Record<string, string> = {
      yurtici: `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${trackingNo}`,
      mng: `https://www.mngkargo.com.tr/goruntuleme/sorgu?code=${trackingNo}`,
      aras: `https://www.araskargo.com.tr/tr/Takip?q=${trackingNo}`,
      surat: `https://www.suratkargo.com.tr/kargotakip?takipno=${trackingNo}`,
    };
    return urls[company.toLowerCase()] || '';
  }
}
