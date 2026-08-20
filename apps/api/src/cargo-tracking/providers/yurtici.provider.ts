import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.client';
import { CargoFirmBase, CargoShipmentRequest, CargoCheckResult, CargoProviderNotConfiguredError } from '../cargo-provider.interface';

/**
 * Yurtiçi Kargo (api.yurticikargo.com)
 * createShipment: POST /integration/order/createShipment (user, pass, cargoKey)
 * checkStatus:    POST /integration/order/checkShipment (user, pass, cargoKey)
 */
@Injectable()
export class YurticiProvider extends CargoFirmBase {
  readonly company = 'yurtici';
  readonly label = 'Yurtiçi Kargo';
  private readonly logger = new Logger(YurticiProvider.name);

  constructor(supabase: SupabaseService) { super(supabase); }

  async createShipment(tenantId: string, req: CargoShipmentRequest): Promise<{ trackingNumber: string; raw?: unknown }> {
    const creds = await this.getCredentials(tenantId);
    if (!creds) throw new CargoProviderNotConfiguredError(this.company);
    try {
      const response = await fetch('https://api.yurticikargo.com/integration/order/createShipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: creds.apiKey,
          pass: creds.apiSecret,
          cargoKey: creds.extra.cargo_key || '',
          invoiceKey: req.orderNumber,
          receiverName: req.customerName,
          receiverPhone: req.customerPhone,
          receiverAddress: req.customerAddress,
          receiverCity: req.customerCity,
          isCOD: req.codAmount > 0,
          codAmount: req.codAmount || undefined,
          shipments: req.items.map((i) => ({ typeId: 1, numberOfPackage: 1, desi: 1, productId: i.productName, price: i.price })),
        }),
      });
      const json = await response.json().catch(() => ({})) as any;
      if (!response.ok || !json?.cargoKeyList?.[0]) {
        throw new Error(json?.error || `Yurtiçi Kargo HTTP ${response.status}`);
      }
      return { trackingNumber: String(json.cargoKeyList[0]), raw: json };
    } catch (err) {
      this.logger.error(`Yurtiçi gönderim hatası: ${(err as Error).message}`);
      throw err;
    }
  }

  async checkStatus(tenantId: string, trackingNumber: string): Promise<CargoCheckResult> {
    const creds = await this.getCredentials(tenantId);
    if (!creds) return { status: 'unknown' };
    try {
      const response = await fetch('https://api.yurticikargo.com/integration/order/checkShipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: creds.apiKey, pass: creds.apiSecret, cargoKeys: [trackingNumber] }),
      });
      const json = await response.json().catch(() => ({})) as any;
      const info = json?.shipmentInfo?.[0];
      const state = String(info?.state || '').toLowerCase();
      if (state.includes('teslim')) return { status: 'delivered', description: 'Teslim edildi', raw: info };
      if (state.includes('dağıtıma') || state.includes('dağıtımda') || state.includes('saha personelinde') || state.includes('teslimatçıda')) return { status: 'out_for_delivery', description: 'Dağıtımda', raw: info };
      if (state.includes('şubede') || state.includes('varış şubesinde') || state.includes('şubemizde')) return { status: 'at_branch', description: 'Şubede', raw: info };
      if (state.includes('yolda') || state.includes('aktarma') || state.includes('sevkiyat')) return { status: 'in_transit', description: 'Kargoda', raw: info };
      return { status: 'unknown', description: info?.state || 'Bilinmiyor', raw: info };
    } catch (err) {
      this.logger.error(`Yurtiçi sorgu hatası: ${(err as Error).message}`);
      return { status: 'unknown', description: (err as Error).message };
    }
  }
}