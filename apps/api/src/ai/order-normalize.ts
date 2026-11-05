import { PaymentMethod } from '@siparis/types';

const TR_MONTHS: Record<string, number> = {
  ocak: 1, subat: 2, mart: 3, nisan: 4, mayis: 5, haziran: 6,
  temmuz: 7, agustos: 8, eylul: 9, ekim: 10, kasim: 11, aralik: 12,
};

const DIACRITICS_TO_ASCII: Record<string, string> = {
  'ş': 's', 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ç': 'c',
};

function foldTr(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[şığüöç]/g, (c) => DIACRITICS_TO_ASCII[c] || c);
}

/**
 * Ödeme yöntemi normalizasyonu (telefon kanalı `normPayment` ile aynı davranış).
 * Tanınmayan/belirsiz değerlerde `undefined` döner; çağıran taraf sipariş açmamalıdır.
 */
export function normalizePayment(value: unknown): PaymentMethod | undefined {
  const k = foldTr(String(value ?? '').trim());
  if (!k) return undefined;

  const hasKapida = /(kap.?da)/i.test(k);
  const hasKart = /(kart|kredi|credit|card)/.test(k);
  const hasNakit = /(nakit|pesin|cash)/.test(k);

  if (hasKapida && hasKart) return 'kapida_kart';
  if (hasKapida || hasNakit || /cod/.test(k)) return 'cash_on_delivery';
  if (/(iban|havale|eft|transfer)/.test(k)) return 'iban';
  if (/iyzico/.test(k)) return 'iyzico';
  if (/paytr/.test(k) || hasKart) return 'paytr';
  if (/(website|web|site|online)/.test(k)) return 'website';
  if (['iban', 'website', 'paytr', 'iyzico', 'cash_on_delivery', 'kapida_kart'].includes(k)) {
    return k as PaymentMethod;
  }
  return undefined;
}

function toIsoDate(day: number, month: number, year: number): string | null {
  if (!(day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100)) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Doğum gününü ISO (YYYY-MM-DD) formata çevirir: "24-02-1988", "1988-02-24", "24 Şubat 1988".
 * Çözülemeyen değerlerde `null` döner.
 */
export function parseBirthday(value: unknown): string | null {
  const raw = foldTr(String(value ?? '').trim());
  if (!raw) return null;

  let m = raw.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (m) return toIsoDate(Number(m[3]), Number(m[2]), Number(m[1]));

  m = raw.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
  if (m) return toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));

  m = raw.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (m) {
    const month = TR_MONTHS[m[2]];
    if (month) return toIsoDate(Number(m[1]), month, Number(m[3]));
  }
  return null;
}
