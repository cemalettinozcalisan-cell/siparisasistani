import { SupabaseService } from '../common/supabase.client';

export class CargoProviderNotConfiguredError extends Error {
  constructor(company: string) {
    super(`cargo_${company}: provider_not_configured`);
    this.name = 'CargoProviderNotConfiguredError';
  }
}

export interface CargoShipmentRequest {
  tenantId: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  items: { productName: string; quantity: number; unit: string; price: number }[];
  totalPrice: number;
  /** Kapıda ödeme tutarı (yoksa 0) */
  codAmount: number;
}

export type CargoStatus = 'pending' | 'in_transit' | 'at_branch' | 'out_for_delivery' | 'delivered' | 'failed' | 'unknown';

export interface CargoCheckResult {
  status: CargoStatus;
  description?: string;
  raw?: unknown;
}

export interface CargoCredentials {
  apiKey: string;
  apiSecret: string;
  extra: Record<string, unknown>;
}

export interface CargoFirmAdapter {
  readonly company: string;
  readonly label: string;
  getCredentials(tenantId: string): Promise<CargoCredentials | null>;
  isConfigured(tenantId: string): Promise<boolean>;
  createShipment(tenantId: string, req: CargoShipmentRequest): Promise<{ trackingNumber: string; raw?: unknown }>;
  checkStatus(tenantId: string, trackingNumber: string): Promise<CargoCheckResult>;
}

/**
 * Tüm kargo firmalarının ortak tabanı.
 * Kimlik bilgileri cargo_integrations tablosundan okunur; tanımlı değilse
 * firmalar dormant kalır (gönderim yapılmaz, durum unknown döner).
 */
export abstract class CargoFirmBase implements CargoFirmAdapter {
  abstract readonly company: string;
  abstract readonly label: string;

  constructor(protected readonly supabase: SupabaseService) {}

  async getCredentials(tenantId: string): Promise<CargoCredentials | null> {
    const { data } = await this.supabase.db
      .from('cargo_integrations')
      .select('api_key, api_secret, extra_config')
      .eq('tenant_id', tenantId)
      .eq('company', this.company)
      .maybeSingle();

    if (!data?.api_key) return null;
    return {
      apiKey: data.api_key as string,
      apiSecret: (data.api_secret as string) || '',
      extra: (data.extra_config as Record<string, unknown>) || {},
    };
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    return Boolean(await this.getCredentials(tenantId));
  }

  abstract createShipment(tenantId: string, req: CargoShipmentRequest): Promise<{ trackingNumber: string; raw?: unknown }>;
  abstract checkStatus(tenantId: string, trackingNumber: string): Promise<CargoCheckResult>;
}