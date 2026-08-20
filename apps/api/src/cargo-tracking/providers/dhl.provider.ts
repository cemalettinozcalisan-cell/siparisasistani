import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.client';
import { CargoFirmBase, CargoShipmentRequest, CargoCheckResult, CargoProviderNotConfiguredError } from '../cargo-provider.interface';

/**
 * DHL (api-eu.dhl.com)
 * createShipment: DHL Express REST (apiKey / x-api-key)
 * checkStatus:    GET /track/shipments?trackingNumber={no}
 */
@Injectable()
export class DhlProvider extends CargoFirmBase {
  readonly company = 'dhl';
  readonly label = 'DHL';
  private readonly logger = new Logger(DhlProvider.name);

  constructor(supabase: SupabaseService) { super(supabase); }

  async createShipment(tenantId: string, req: CargoShipmentRequest): Promise<{ trackingNumber: string; raw?: unknown }> {
    const creds = await this.getCredentials(tenantId);
    if (!creds) throw new CargoProviderNotConfiguredError(this.company);
    try {
      const response = await fetch('https://api-eu.dhl.com/ship/v1/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': creds.apiKey },
        body: JSON.stringify({
          plannedShippingDateAndTime: new Date().toISOString(),
          pickups: [{ type: 'pickup' }],
          recipient: { address: { addressLine1: req.customerAddress, cityName: req.customerCity, postalCode: String(creds.extra.postal_code || ''), countryCode: 'TR' }, contact: { phoneNumber: req.customerPhone, companyName: req.customerName, fullName: req.customerName } },
          shipmentDetails: [{ productCode: 'P', customerReference: req.orderNumber, customerDetails: { shipperDetails: { postalAddress: {} } } }],
          content: { isCustomsDeclarable: false, description: req.items.map((i) => `${i.productName} x${i.quantity}${i.unit}`).join(', '), packages: [{ type: 'PKG', dimensions: { uom: 'CM', height: 10, length: 30, width: 20 }, weight: { value: 1, uom: 'KG' } }] },
        }),
      });
      const json = await response.json().catch(() => ({})) as any;
      const tracking = json?.shipmentTrackingNumber || json?.packages?.[0]?.trackingNumber;
      if (!response.ok || !tracking) {
        throw new Error(json?.title || json?.message || `DHL HTTP ${response.status}`);
      }
      return { trackingNumber: String(tracking), raw: json };
    } catch (err) {
      this.logger.error(`DHL gönderim hatası: ${(err as Error).message}`);
      throw err;
    }
  }

  async checkStatus(tenantId: string, trackingNumber: string): Promise<CargoCheckResult> {
    const creds = await this.getCredentials(tenantId);
    if (!creds) return { status: 'unknown' };
    try {
      const response = await fetch(`https://api-eu.dhl.com/track/shipments?trackingNumber=${encodeURIComponent(trackingNumber)}`, {
        headers: { 'x-api-key': creds.apiKey },
      });
      const json = await response.json().catch(() => ({})) as any;
      const statusText = String(json?.shipments?.[0]?.status?.statusCode || '').toLowerCase();
      if (statusText.includes('delivered')) return { status: 'delivered', description: 'Teslim edildi', raw: json };
      if (statusText.includes('out for delivery') || statusText.includes('with courier') || statusText.includes('delivery attempted')) return { status: 'out_for_delivery', description: 'Dağıtımda', raw: json };
      if (statusText.includes('at delivery facility') || statusText.includes('arrived at') || statusText.includes('in delivery facility') || statusText.includes('at facility')) return { status: 'at_branch', description: 'Şubede', raw: json };
      if (statusText.includes('transit') || statusText.includes('pre-transit')) return { status: 'in_transit', description: 'Kargoda', raw: json };
      return { status: 'unknown', description: json?.shipments?.[0]?.status?.description || 'Bilinmiyor', raw: json };
    } catch (err) {
      this.logger.error(`DHL sorgu hatası: ${(err as Error).message}`);
      return { status: 'unknown', description: (err as Error).message };
    }
  }
}