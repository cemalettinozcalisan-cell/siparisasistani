import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AiOrderInput } from '@siparis/types';

const OrderSchema = z.object({
  customer: z.object({
    name: z.string().min(2, 'Müşteri adı en az 2 karakter olmalı'),
    phone: z.string().min(10, 'Geçersiz telefon numarası'),
    address: z.string().optional(),
  }),
  products: z
    .array(
      z.object({
        product_name: z.string().min(1, 'Ürün adı gerekli'),
        quantity: z.number().positive('Miktar pozitif olmalı'),
        unit: z.string().min(1, 'Birim gerekli'),
      }),
    )
    .min(1, 'En az bir ürün gerekli'),
  payment: z.enum(['iban', 'website', 'paytr', 'iyzico']),
  confirmed: z.literal(true, {
    errorMap: () => ({ message: 'Sipariş onaylanmamış' }),
  }),
  confidence: z.number().min(0).max(100),
  channel: z.enum(['phone', 'whatsapp', 'manual', 'sms']),
});

export type ValidationResult =
  | { valid: true; data: AiOrderInput }
  | { valid: false; errors: string[] };

@Injectable()
export class OrderValidatorService {
  validate(input: unknown): ValidationResult {
    const result = OrderSchema.safeParse(input);

    if (result.success) {
      return { valid: true, data: result.data as AiOrderInput };
    }

    return {
      valid: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  validatePartial(input: Record<string, unknown>): string[] {
    const partial = OrderSchema.partial();
    const result = partial.safeParse(input);

    if (result.success) return [];

    return result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  }
}
