export type OrderChannel = 'phone' | 'whatsapp' | 'manual' | 'sms';
export type OrderSource = 'PHONE' | 'WHATSAPP' | 'PANEL' | 'WEBSITE';
export type OrderStatus = 'new' | 'approved' | 'preparing' | 'shipped' | 'completed' | 'cancelled';
export type PaymentMethod = 'iban' | 'website' | 'paytr' | 'iyzico' | 'cash_on_delivery';
export type PaymentStatus = 'waiting' | 'paid' | 'failed';

export interface AiOrderInput {
  customer: {
    name: string;
    phone: string;
    address?: string;
    city?: string;
  };
  products: AiOrderProduct[];
  payment: PaymentMethod;
  confirmed: boolean;
  confidence: number;
  channel: OrderChannel;
  source?: OrderSource;
  notes?: string;
}

export interface AiOrderProduct {
  product_name: string;
  quantity: number;
  unit: string;
}

export interface OrderResult {
  order_id: string;
  order_number: string;
  tenant_id: string;
  customer_id: string;
  total_price: number;
  status: OrderStatus;
  confidence: number;
}
