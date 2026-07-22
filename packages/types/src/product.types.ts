export type SaleType = 'KG' | 'SAP' | 'ADET' | 'KOLI';

export interface ProductSaleConfig {
  saleTypes: SaleType[];
  variableWeight: boolean;
  avgWeightGr?: number;
  minWeightGr?: number;
  maxWeightGr?: number;
  aiRules?: string;
  categorySaleType?: string;
}

export interface Campaign {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  condition: string;
  offer: string;
  minAmount?: number;
  minQuantity?: number;
  targetProduct?: string;
  startDate?: string;
  endDate?: string;
  active: boolean;
}

export const SALE_TYPE_LABELS: Record<SaleType, string> = {
  KG: 'Kilogram',
  SAP: 'Sap (Adet)',
  ADET: 'Adet',
  KOLI: 'Koli',
};
