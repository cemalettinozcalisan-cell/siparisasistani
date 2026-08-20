import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.client';
import { CargoFirmBase, CargoShipmentRequest, CargoCheckResult, CargoProviderNotConfiguredError } from '../cargo-provider.interface';

/**
 * MNG Kargo (apiv2.mngkargo.com.tr)
 * createShipment: POST /v2/shipment (ApiKey + secret, gönderi detayı)
 * checkStatus:    GET  /v2/tracking/{trackingNumber}
 */
@Injectable()
export class MngProvider extends CargoFirmBase {
  readonly company = 'mng';
  readonly label = 'MNG Kargo';
  private readonly logger = new Logger(MngProvider.name);

  constructor(supabase: SupabaseService) { super(supabase); }

  async createShipment(tenantId: string, req: CargoShipmentRequest): Promise<{ trackingNumber: string; raw?: unknown }> {
    const creds = await this.getCredentials(tenantId);
    if (!creds) throw new CargoProviderNotConfiguredError(this.company);
    try {
      const response = await fetch('https://apiv2.mngkargo.com.tr/v2/shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creds.apiKey}` },
        body: JSON.stringify({
          secret: creds.apiSecret,
          receiverName: req.customerName,
          receiverPhone: req.customerPhone,
          receiverAddress: req.customerAddress,
          receiverCity: req.customerCity,
          codAmount: req.codAmount || 0,
          invoiceNumber: req.orderNumber,
          products: req.items.map((i) => ({ name: i.productName, quantity: i.quantity, unit: i.unit })),
        }),
      });
      const json = await response.json().catch(() => ({})) as any;
      const tracking = json?.trackingNumber || json?.cargoKey || json?.result?.trackingNumber;
      if (!response.ok || !tracking) {
        throw new Error(json?.message || json?.error || `MNG Kargo HTTP ${response.status}`);
      }
      return { trackingNumber: String(tracking), raw: json };
    } catch (err) {
      this.logger.error(`MNG gönderim hatası: ${(err as Error).message}`);
      throw err;
    }
  }

  async checkStatus(tenantId: string, trackingNumber: string): Promise<CargoCheckResult> {
    const creds = await this.getCredentials(tenantId);
    if (!creds) return { status: 'unknown' };
    try {
      const response = await fetch(`https://apiv2.mngkargo.com.tr/v2/tracking/${encodeURIComponent(trackingNumber)}`, {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
      });
      const json = await response.json().catch(() => ({})) as any;
      const statusText = String(json?.status || json?.eventCode || '').toLowerCase();
      if (statusText.includes('teslim')) return { status: 'delivered', description: 'Teslim edildi', raw: json };
      if (statusText.includes('dağıtıma') || statusText.includes('dağıtımda') || statusText.includes('saha personelinde') || statusText.includes('teslimatçıda')) return { status: 'out_for_delivery', description: 'Dağıtımda', raw: json };
      if (statusText.includes('şubede') || statusText.includes('varış şubesinde') || statusText.includes('şubemizde')) return { status: 'at_branch', description: 'Şubede', raw: json };
      if (statusText.includes('yolda') || statusText.includes('aktarma') || statusText.includes('sevkiyat')) return { status: 'in_transit', description: 'Kargoda', raw: json };
      return { status: 'unknown', description: json?.status || 'Bilinmiyor', raw: json };
    } catch (err) {
      this.logger.error(`MNG sorgu hatası: ${(err as Error).message}`);
      return { status: 'unknown', description: (err as Error).message };
    }
  }
}