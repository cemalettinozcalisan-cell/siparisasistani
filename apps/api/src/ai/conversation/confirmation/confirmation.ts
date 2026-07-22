import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfirmationService {
  buildSummary(data: {
    customer: { name: string; phone?: string };
    products: { product_name: string; quantity: number; unit: string }[];
    totalPrice?: number;
    address?: string;
    payment?: string;
  }): string {
    const items = data.products
      .map((p) => `- ${p.quantity} ${p.unit} ${p.product_name}`)
      .join('\n');

    return [
      'Sipariş özeti:',
      '',
      `Müşteri: ${data.customer.name}`,
      data.customer.phone ? `Telefon: ${data.customer.phone}` : '',
      '',
      'Ürünler:',
      items,
      '',
      data.totalPrice ? `Toplam: ${data.totalPrice.toLocaleString('tr-TR')} TL` : '',
      data.address ? `Adres: ${data.address}` : '',
      data.payment ? `Ödeme: ${data.payment}` : '',
      '',
      'Onaylıyor musunuz?',
    ]
      .filter(Boolean)
      .join('\n');
  }

  calculateConfidence(input: {
    customerName?: string;
    productCount: number;
    hasAddress?: boolean;
    hasPayment?: boolean;
  }): number {
    let score = 50;

    if (input.customerName) score += 15;
    if (input.productCount > 0) score += 15;
    if (input.hasAddress) score += 10;
    if (input.hasPayment) score += 10;

    return Math.min(score, 100);
  }

  getConfidenceLabel(score: number): { label: string; color: string } {
    if (score >= 90) return { label: 'Çok Güvenli', color: 'green' };
    if (score >= 70) return { label: 'Güvenli', color: 'yellow' };
    if (score >= 50) return { label: 'Kontrol Gerekli', color: 'orange' };
    return { label: 'Dinleme Önerilir', color: 'red' };
  }
}
