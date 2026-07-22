import { Injectable } from '@nestjs/common';

export interface SummaryInput {
  customerName?: string;
  products: { product_name: string; quantity: number; unit: string }[];
  address?: string;
  phone?: string;
  payment?: string;
  totalPrice?: number;
  cargoPrice?: number;
  campaign?: string;
  missingFields: string[];
}

@Injectable()
export class OrderSummaryService {
  buildSummary(input: SummaryInput): string {
    const parts: string[] = [];
    const name = input.customerName || 'Müşteri';

    parts.push(`${name} Bey/Hanım, birlikte kontrol edelim:`);
    parts.push('');

    for (const p of input.products) {
      parts.push(`• ${p.quantity} ${p.unit} ${p.product_name}`);
    }

    if (input.address) {
      parts.push(`• Adres: ${input.address}`);
    }

    if (input.phone) {
      parts.push(`• Telefon: Bu numaranız üzerinden devam edeceğiz`);
    }

    if (input.payment) {
      parts.push(`• Ödeme: ${input.payment}`);
    } else {
      parts.push(`• Ödeme: Henüz belirtilmedi`);
    }

    if (input.totalPrice) {
      const total = input.totalPrice + (input.cargoPrice || 0);
      parts.push('');
      if (input.campaign) {
        parts.push(`Kampanya: ${input.campaign}`);
      }
      if (input.cargoPrice) {
        parts.push(`Kargo ücreti: ${input.cargoPrice.toLocaleString('tr-TR')} TL`);
      }
      parts.push(`Güncel fiyatlara göre yaklaşık ${total.toLocaleString('tr-TR')} TL tutuyor.`);
    }

    if (input.missingFields.length > 0) {
      const missingTexts: Record<string, string> = {
        address: 'Teslimat adresinizi de alabilirsem siparişi tamamlayacağım.',
        phone: 'Size ulaşabileceğim bir telefon numarası paylaşır mısınız?',
        payment: 'Ödeme yönteminizi de öğrenebilirsem siparişinizi tamamlayacağım.',
      };
      parts.push('');
      for (const field of input.missingFields) {
        if (missingTexts[field]) parts.push(missingTexts[field]);
      }
    }

    parts.push('');
    parts.push('Gözümden kaçan bir şey varsa lütfen söyleyin.');
    parts.push('Ben doğru anladıysam onayınızla siparişinizi oluşturalım.');

    return parts.join('\n');
  }

  buildFinalConfirmation(input: SummaryInput): string {
    const parts: string[] = [];
    const name = input.customerName || 'Müşteri';

    parts.push(`Son kez onaylıyor musunuz ${name} Bey/Hanım?`);
    parts.push('');
    for (const p of input.products) {
      parts.push(`• ${p.quantity} ${p.unit} ${p.product_name}`);
    }
    if (input.address) parts.push(`• ${input.address}`);
    if (input.payment) parts.push(`• Ödeme: ${input.payment}`);

    if (input.totalPrice) {
      const total = input.totalPrice + (input.cargoPrice || 0);
      parts.push(`• Toplam: yaklaşık ${total.toLocaleString('tr-TR')} TL`);
    }

    parts.push('');
    parts.push('Onaylıyorsanız siparişinizi oluşturuyorum.');

    return parts.join('\n');
  }
}
