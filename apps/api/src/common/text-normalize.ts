/**
 * Türkçe metin normalizasyonu.
 *
 * Müşteriler "gönderdim" kelimesini "gonderdim", "gondrdim", "gonderdm",
 * "gonderdım" gibi yazabiliyor. Dekont tespitini aksan/typo toleranslı yapmak
 * için metni sadeleştiriyoruz.
 */
const TR_FOLD: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  I: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

export function foldTr(input: string): string {
  return String(input || '')
    .split('')
    .map((ch) => TR_FOLD[ch] ?? ch)
    .join('')
    .toLowerCase();
}

const DEKONT_SENT_PATTERN =
  /(?:gond(?:e)?rd[i]?m|gond(?:e)?rd[i]?k|att[i]?m|ilett[i]?m|yollad[i]?m|ulast[i]?|oded[i]?m|odeme(?:yi)?\s*(?:yapt[i]?m|gond(?:e)?rd[i]?m)|havale(?:yi)?\s*(?:yapt[i]?m|gond(?:e)?rd[i]?m)|transfer(?:i)?\s*(?:yapt[i]?m|gond(?:e)?rd[i]?m|ett[i]?m))/;

/**
 * "Gönderdim / attım / ödedim / havale yaptım" gibi TAMAMLANMIŞ dekont beyanı.
 * Gelecek zaman ("göndereceğim", "atacağım") eşleşmez.
 */
export function isDekontSent(text: string): boolean {
  return DEKONT_SENT_PATTERN.test(foldTr(text));
}

/** SMS gibi kanallarda "dekont" kelimesi geçen mesajları da dekont ipucu sayar. */
export function isDekontHint(text: string): boolean {
  return isDekontSent(text) || foldTr(text).includes('dekont');
}
