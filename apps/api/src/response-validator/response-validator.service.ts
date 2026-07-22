import { Injectable, Logger } from '@nestjs/common';

export interface ValidationCheck {
  check: string;
  passed: boolean;
  detail?: string;
}

export interface ValidationResult {
  passed: boolean;
  failedChecks: ValidationCheck[];
  score: number;
}

@Injectable()
export class ResponseValidatorService {
  private readonly logger = new Logger(ResponseValidatorService.name);

  validate(reply: string, context: {
    hasName: boolean; hasAddress: boolean; hasPhone: boolean;
    hasPayment: boolean; hasProducts: boolean; isReturningCustomer: boolean;
    stage: string;
  }): ValidationResult {
    const lower = reply.toLowerCase();
    const checks: ValidationCheck[] = [];

    // 1. Yasaklı ifade kontrolü
    const banned = ['siparisinizi aliyorum', 'size nasil yardimci olabilirim',
      'isleminiz basariyla tamamlanmistir', 'bilginiz olsun'];
    const foundBanned = banned.filter((b) => lower.includes(b));
    checks.push({ check: 'Yasaklı ifade var mı?', passed: foundBanned.length === 0, detail: foundBanned.join(', ') });

    // 2. Aynı bilgiyi tekrar sorgulama
    const reasked = (context.hasName && lower.includes('adiniz')) ||
      (context.hasAddress && (lower.includes('adresinizi') || lower.includes('adresiniz')));
    checks.push({ check: 'Bildiği bilgiyi tekrar sordu mu?', passed: !reasked });

    // 3. Özet var mı?
    const hasSummary = lower.includes('•') || lower.includes('kontrol edelim') ||
      lower.includes('ozet') || lower.includes('su sekilde');
    checks.push({ check: 'Özet okudu mu?', passed: hasSummary });

    // 4. Toplam tutar var mı?
    const hasTotal = lower.includes('tl') && (lower.includes('toplam') || lower.includes('tutar') || lower.includes('yaklasik'));
    checks.push({ check: 'Toplam tutar söylendi mi?', passed: hasTotal || context.stage === 'listening' });

    // 5. Eksik bilgi sırası
    if (context.stage === 'asking_missing_info') {
      const phoneAsked = context.hasPhone || lower.includes('telefon');
      const paymentAsked = context.hasPayment || lower.includes('odeme');
      checks.push({ check: 'Eksik bilgiler doğru sırada mı?', passed: phoneAsked || paymentAsked });
    }

    // 6. Onay
    if (context.stage === 'confirmation') {
      const askedConfirm = lower.includes('onay') || lower.includes('dogru') ||
        lower.includes('kontrol') || lower.includes('eklemek');
      checks.push({ check: 'Onay isteniyor mu?', passed: askedConfirm });
    }

    // 7. Doğallık
    const tooFormal = lower.includes('rica ederim') || lower.includes('saygilarimla');
    checks.push({ check: 'Konuşma doğal mı?', passed: !tooFormal });

    const failed = checks.filter((c) => !c.passed);
    const score = Math.round(((checks.length - failed.length) / checks.length) * 100);
    const passed = failed.length === 0;

    if (!passed) {
      this.logger.warn(`Response validation FAILED (${score}%): ${failed.map((f) => f.check).join(', ')}`);
    }

    return { passed, failedChecks: failed, score };
  }
}
