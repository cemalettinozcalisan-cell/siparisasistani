import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.client';
import { CargoFirmBase, CargoShipmentRequest, CargoCheckResult, CargoProviderNotConfiguredError } from '../cargo-provider.interface';

/**
 * Aras Kargo (openapi.araskargo.com.tr)
 * createShipment: POST /api/shipment (kullanıcı adı, şifre, gönderi detayı)
 * checkStatus:    GET  /api/tracking/{trackingNumber}
 */
@Injectable()
export class ArasProvider extends CargoFirmBase {
  readonly company = 'aras';
  readonly label = 'Aras Kargo';
  private readonly logger = new Logger(ArasProvider.name);

  constructor(supabase: SupabaseService) { super(supabase); }

  async createShipment(tenantId: string, req: CargoShipmentRequest): Promise<{ trackingNumber: string; raw?: unknown }> {
    const creds = await this.getCredentials(tenantId);
    if (!creds) throw new CargoProviderNotConfiguredError(this.company);
    try {
      const response = await fetch('https://openapi.araskargo.com.tr/api/shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString('base64')}` },
        body: JSON.stringify({
          receiverName: req.customerName,
          receiverPhone: req.customerPhone,
          receiverAddress: req.customerAddress,
          receiverCity: req.customerCity,
          cargoDescription: req.items.map((i) => `${i.productName} x${i.quantity}${i.unit}`).join(', '),
          codAmount: req.codAmount || 0,
          invoiceNumber: req.orderNumber,
        }),
      });
      const json = await response.json().catch(() => ({})) as any;
      const tracking = json?.trackingNumber || json?.cargoKey || json?.shipment?.trackingNumber;
      if (!response.ok || !tracking) {
        throw new Error(json?.message || json?.error || `Aras Kargo HTTP ${response.status}`);
      }
      return { trackingNumber: String(tracking), raw: json };
    } catch (err) {
      this.logger.error(`Aras gönderim hatası: ${(err as Error).message}`);
      throw err;
    }
  }

  async checkStatus(tenantId: string, trackingNumber: string): Promise<CargoCheckResult> {
    const creds = await this.getCredentials(tenantId);
    if (!creds) return { status: 'unknown' };
    try {
      const response = await fetch(`https://openapi.araskargo.com.tr/api/tracking/${encodeURIComponent(trackingNumber)}`, {
        headers: { Authorization: `Basic ${Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString('base64')}` },
      });
      const json = await response.json().catch(() => ({})) as any;
      const statusText = String(json?.status || json?.eventCode || '').toLowerCase();
      if (statusText.includes('teslim')) return { status: 'delivered', description: 'Teslim edildi', raw: json };
      if (statusText.includes('yolda') || statusText.includes('aktarma') || statusText.includes('sevkiyat')) return { status: 'in_transit', description: 'Kargoda', raw: json };
      return { status: 'unknown', description: json?.status || 'Bilinmiyor', raw: json };
    } catch (err) {
      this.logger.error(`Aras sorgu hatası: ${(err as Error).message}`);
      return { status: 'unknown', description: (err as Error).message };
    }
  }
}