export type ConfidenceLevel = 'safe' | 'suggest_review' | 'required_review';

export interface DualConfidence {
  parsingConfidence: number;
  completionScore: number;
  missingFields: string[];
}

export interface ConfidenceResult {
  score: number;
  level: ConfidenceLevel;
  label: string;
  action: string;
}

export function evaluateConfidence(score: number): ConfidenceResult {
  if (score >= 90) return { score, level: 'safe', label: 'Çok Güvenli', action: 'İnsan Kontrolü Gerekli Değil' };
  if (score >= 70) return { score, level: 'suggest_review', label: 'Güvenli', action: 'İnsan Kontrolü Öneriliyor' };
  if (score >= 50) return { score, level: 'required_review', label: 'Düşük Güven', action: 'İnsan Kontrolü Gerekli' };
  return { score, level: 'required_review', label: 'Çok Düşük Güven', action: 'Ses Kaydı Dinlenmeli' };
}

export function calculateDualConfidence(input: {
  hasName: boolean; hasAddress: boolean; hasPhone: boolean;
  hasPayment: boolean; hasProducts: boolean; hasConfirmed: boolean;
}): DualConfidence {
  let parsing = 0;
  if (input.hasName) parsing += 15;
  if (input.hasPhone) parsing += 15;
  if (input.hasAddress) parsing += 15;
  if (input.hasProducts) parsing += 30;
  if (input.hasPayment) parsing += 15;
  if (input.hasConfirmed) parsing += 10;

  const missing: string[] = [];
  if (!input.hasPhone) missing.push('phone');
  if (!input.hasAddress) missing.push('address');
  if (!input.hasPayment) missing.push('payment');
  if (!input.hasConfirmed) missing.push('confirmation');

  const completionScore = missing.length === 0 ? 100 : Math.max(0, 100 - missing.length * 15);

  return {
    parsingConfidence: Math.min(parsing, 100),
    completionScore,
    missingFields: missing,
  };
}
