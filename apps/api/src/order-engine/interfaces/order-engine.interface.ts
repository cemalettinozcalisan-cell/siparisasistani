import { AiOrderInput, OrderResult } from '@siparis/types';

export interface IOrderEngine {
  process(input: AiOrderInput): Promise<OrderResult>;
  cancelOrder(orderId: string): Promise<void>;
  updateStatus(orderId: string, status: string): Promise<void>;
}
