import { Injectable, Logger } from '@nestjs/common';

export interface QualityMetrics {
  totalScore: number;
  breakdown: { metric: string; score: number; maxScore: number }[];
  passed: boolean;
}

@Injectable()
export class QualityService {
  private readonly logger = new Logger(QualityService.name);

  evaluate(reply: string, context: {
    hasName: boolean; hasAddress: boolean; hasPhone: boolean;
    hasPayment: boolean; hasProducts: boolean;
    channel: string;
  }): QualityMetrics {
    const lower = reply.toLowerCase();
    const breakdown: { metric: string; score: number; maxScore: number }[] = [];
    let total = 100;

    // Robotik ifade kontrolü
    if (lower.includes('isleminiz basariyla') || lower.includes('size nasil yardimci olabilirim')) {
      total -= 15;
      breakdown.push({ metric: 'Robotik ifade', score: 0, maxScore: 15 });
    } else {
      breakdown.push({ metric: 'Robotik ifade yok', score: 15, maxScore: 15 });
    }

    // İsmi kullanma
    if (context.hasName && (lower.includes('bey') || lower.includes('hanim'))) {
      total += 3;
      breakdown.push({ metric: 'İsim kullanımı', score: 3, maxScore: 3 });
    } else {
      breakdown.push({ metric: 'İsim kullanımı', score: 0, maxScore: 3 });
    }

    // Adres tekrarı kontrolü
    if (context.hasAddress && (lower.includes('adresiniz') || lower.includes('adresinizi'))) {
      total -= 10;
      breakdown.push({ metric: 'Adres tekrarı', score: 0, maxScore: 10 });
    } else {
      breakdown.push({ metric: 'Adres tekrarı yok', score: 10, maxScore: 10 });
    }

    // Kampanya doğru yerde mi
    const hasCampaign = lower.includes('kampanya') || lower.includes('indirim');
    const hasSummary = lower.includes('•') || lower.includes('kontrol edelim') || lower.includes('ozet');
    if (hasCampaign && hasSummary) {
      total += 5;
      breakdown.push({ metric: 'Kampanya doğru sırada', score: 5, maxScore: 5 });
    } else if (hasCampaign) {
      total -= 10;
      breakdown.push({ metric: 'Kampanya erken sunulmuş', score: 0, maxScore: 5 });
    } else {
      breakdown.push({ metric: 'Kampanya değerlendirmesi', score: 3, maxScore: 5 });
    }

    // Doğal ifade
    const natural = ['anladim', 'tamamdir', 'not ettim', 'kontrol edelim', 'buyurun', 'efendim',
      'afiyet olsun', 'insallah', 'tesekkur'];
    const usedNatural = natural.filter((w) => lower.includes(w));
    if (usedNatural.length >= 1) {
      total += 2;
      breakdown.push({ metric: 'Doğal ifade', score: 2, maxScore: 2 });
    } else {
      breakdown.push({ metric: 'Doğal ifade', score: 0, maxScore: 2 });
    }

    // Özet okuma
    if (hasSummary) {
      total += 5;
      breakdown.push({ metric: 'Özet okundu', score: 5, maxScore: 5 });
    } else {
      total -= 5;
      breakdown.push({ metric: 'Özet okunmadı', score: 0, maxScore: 5 });
    }

    // Telefon tekrarı
    if (context.hasPhone && lower.includes('telefon')) {
      total -= 10;
      breakdown.push({ metric: 'Telefon tekrarı', score: 0, maxScore: 10 });
    } else {
      breakdown.push({ metric: 'Telefon tekrarı yok', score: 10, maxScore: 10 });
    }

    const finalScore = Math.max(0, Math.min(100, total));
    const passed = finalScore >= 70;

    return { totalScore: finalScore, breakdown, passed };
  }
}
