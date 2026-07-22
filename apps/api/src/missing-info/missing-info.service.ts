import { Injectable } from '@nestjs/common';

export interface MissingField {
  field: string;
  priority: number;
  question: string;
  variants: string[];
}

@Injectable()
export class MissingInfoService {
  private readonly priorityOrder: string[] = ['phone', 'payment', 'address', 'note'];

  getMissingFields(input: {
    hasPhone: boolean;
    hasAddress: boolean;
    hasPayment: boolean;
    isPhoneChannel: boolean;
  }): MissingField[] {
    const missing: MissingField[] = [];

    if (!input.hasPhone) {
      missing.push({
        field: 'phone',
        priority: input.isPhoneChannel ? 99 : 1,
        question: 'Size ulasabilecegimiz bir telefon numarasi paylasir misiniz?',
        variants: [
          'Bir telefon numaranizi da not edeyim.',
          'Size ulasabilecegimiz bir telefon numarasi rica edebilir miyim?',
          'Telefon numaranizi alabilir miyim?',
        ],
      });
    }

    if (!input.hasPayment) {
      missing.push({
        field: 'payment',
        priority: 2,
        question: 'Odeme yonteminizi de ogrenebilirsem siparisi tamamlayacagim.',
        variants: [
          'Odeme yonteminizi ogrenebilir miyim? Havale veya kredi karti?',
          'Nasil odeme yapmak istersiniz?',
          'Odeme icin IBAN bilgimizi ileteyim mi, yoksa kartla odemeyi mi tercih edersiniz?',
        ],
      });
    }

    if (!input.hasAddress) {
      missing.push({
        field: 'address',
        priority: 3,
        question: 'Teslimat adresinizi alabilir miyim?',
        variants: [
          'Adresinizi alabilir miyim?',
          'Teslimat icin adres bilgisi alabilir miyim?',
        ],
      });
    }

    return missing.sort((a, b) => a.priority - b.priority);
  }

  pickVariant(field: MissingField, usedVariants: Set<string>): string {
    const available = field.variants.filter((v) => !usedVariants.has(v));
    const pick = available.length > 0 ? available[0] : field.variants[0];
    usedVariants.add(pick);
    return pick;
  }
}
