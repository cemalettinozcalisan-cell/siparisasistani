import { Injectable, Logger } from '@nestjs/common';

export interface ReviewCriteria {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface ReviewResult {
  overallScore: number;
  criteria: ReviewCriteria[];
  passedCount: number;
  totalCount: number;
}

@Injectable()
export class ConversationReviewerService {
  private readonly logger = new Logger(ConversationReviewerService.name);

  review(reply: string, context: {
    hasName: boolean;
    hasAddress: boolean;
    hasPhone: boolean;
    hasPayment: boolean;
    hasProducts: boolean;
    isReturningCustomer: boolean;
  }): ReviewResult {
    const criteria: ReviewCriteria[] = [];
    const lower = reply.toLowerCase();

    // 1. Söz kesme kontrolü
    const interrupted = this.containsAny(lower, ['tamam', 'evet', 'buyurun']) && reply.length < 50;
    criteria.push({ name: 'Müşterinin sözünü kesti mi?', passed: !interrupted });

    // 2. Gereksiz soru kontrolü
    const askedKnown = (context.hasName && this.containsAny(lower, ['adiniz', 'isminiz', 'adinizi'])) ||
                       (context.hasAddress && this.containsAny(lower, ['adresiniz', 'adresinizi']));
    criteria.push({ name: 'Bildiği bilgiyi tekrar istedi mi?', passed: !askedKnown });

    // 3. Yasaklı ifadeler
    const banned = this.containsAny(lower, [
      'siparisinizi aliyorum', 'siparisinizi not aldim',
      'size nasil yardimci olabilirim', 'isleminiz basariyla tamamlanmistir', 'bilginiz olsun',
    ]);
    criteria.push({ name: 'Yasaklı ifade kullandı mı?', passed: !banned });

    // 4. Esnaf dili
    const natural = this.containsAny(lower, ['not aldim', 'tamamdir', 'kontrol edelim', 'anladim', 'buyurun', 'efendim']);
    criteria.push({ name: 'Esnaf dili kullandı mı?', passed: natural });

    // 5. Özet okudu mu
    const summarized = this.containsAny(lower, ['kontrol edelim', 'ozet', 'birlikte', 'soyle sekilde', 'su sekilde']);
    criteria.push({ name: 'Özet okudu mu?', passed: summarized });

    // 6. Kampanya doğru zamanda
    const prematureCampaign = reply.length < 100 && this.containsAny(lower, ['kampanya', 'indirim']);
    criteria.push({ name: 'Kampanyayı erken önerdi mi?', passed: !prematureCampaign });

    // 7. Eksik bilgi sırası
    if (!context.hasPayment) {
      const askedPayment = this.containsAny(lower, ['odeme', 'kart', 'iban', 'havale']);
      criteria.push({ name: 'Ödeme bilgisini sordu mu?', passed: askedPayment });
    } else {
      criteria.push({ name: 'Ödeme bilgisi tamam', passed: true });
    }

    // 8. Doğallık
    const tooFormal = this.containsAny(lower, ['rica ederim', 'arz ederim', 'saygilarimla']);
    criteria.push({ name: 'Konuşma doğal mı?', passed: !tooFormal });

    // 9. Tekrar eden ifade
    criteria.push({ name: 'Aynı ifadeyi tekrar etti mi?', passed: true });

    // 10. Güven verici
    const reassuring = this.containsAny(lower, ['merak etmeyin', 'birlikte', 'gozumden kacan', 'kontrol ediyoruz']);
    criteria.push({ name: 'Güven verici miydi?', passed: reassuring || summarized });

    const passed = criteria.filter((c) => c.passed).length;
    const score = Math.round((passed / criteria.length) * 100);

    return { overallScore: score, criteria, passedCount: passed, totalCount: criteria.length };
  }

  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some((k) => text.includes(k));
  }
}
