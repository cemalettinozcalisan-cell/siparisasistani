export function normalizeTrPhone(value?: string | null): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('90') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `90${digits.slice(1)}`;
  if (digits.startsWith('5') && digits.length === 10) return `90${digits}`;
  return digits;
}

export function phoneVariants(value?: string | null): string[] {
  const canonical = normalizeTrPhone(value);
  if (!canonical) return [];
  const set = new Set<string>([canonical]);
  if (canonical.startsWith('90') && canonical.length === 12) {
    const local = canonical.slice(2);
    set.add(`0${local}`);
    set.add(local);
  }
  return Array.from(set);
}

export function formatPhoneDisplay(value?: string | null): string {
  return normalizeTrPhone(value);
}
