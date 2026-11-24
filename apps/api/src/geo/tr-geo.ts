import { TR_GEO } from './tr-geo.data';

const ascii = (value: string): string => String(value || '')
  .toLocaleLowerCase('tr-TR')
  .replace(/ç/g, 'c')
  .replace(/ğ/g, 'g')
  .replace(/ı/g, 'i')
  .replace(/ö/g, 'o')
  .replace(/ş/g, 's')
  .replace(/ü/g, 'u')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const CITY_BY_KEY = new Map<string, string>();
const DISTRICTS_BY_CITY = new Map<string, Map<string, string>>();

for (const [city, districts] of Object.entries(TR_GEO)) {
  CITY_BY_KEY.set(ascii(city), city);
  const districtMap = new Map<string, string>();
  for (const district of districts) districtMap.set(ascii(district), district);
  DISTRICTS_BY_CITY.set(city, districtMap);
}

const CITY_ALIASES: Record<string, string> = {
  afyon: 'AFYONKARAHİSAR',
  'afyon karahisar': 'AFYONKARAHİSAR',
  antep: 'GAZİANTEP',
  gaziantepte: 'GAZİANTEP',
  istanbul: 'İSTANBUL',
  izmir: 'İZMİR',
  maras: 'KAHRAMANMARAŞ',
  'kahramanmaras': 'KAHRAMANMARAŞ',
  urfa: 'ŞANLIURFA',
  sanliurfa: 'ŞANLIURFA',
};

for (const [alias, city] of Object.entries(CITY_ALIASES)) {
  CITY_BY_KEY.set(ascii(alias), city);
}

export function resolveTrCity(value: string | null | undefined): string | null {
  const key = ascii(String(value || ''));
  return key ? CITY_BY_KEY.get(key) || null : null;
}

export function resolveTrDistrict(city: string | null | undefined, value: string | null | undefined): string | null {
  const resolvedCity = resolveTrCity(city);
  const key = ascii(String(value || ''));
  if (!resolvedCity || !key) return null;
  return DISTRICTS_BY_CITY.get(resolvedCity)?.get(key) || null;
}

export function listTrCities(): string[] {
  return Object.keys(TR_GEO);
}

export function listTrDistricts(city: string | null | undefined): string[] {
  const resolvedCity = resolveTrCity(city);
  return resolvedCity ? [...(TR_GEO[resolvedCity] || [])] : [];
}

export interface TrLocationResult {
  valid: boolean;
  city?: string;
  district?: string;
  error?: string;
}

export function validateTrLocation(city: string | null | undefined, district: string | null | undefined): TrLocationResult {
  const rawCity = String(city || '').trim();
  const rawDistrict = String(district || '').trim();
  if (!rawCity) return { valid: false, error: 'İl bilgisi zorunlu.' };
  const resolvedCity = resolveTrCity(rawCity);
  if (!resolvedCity) return { valid: false, error: `"${rawCity}" geçerli bir il değil.` };
  if (!rawDistrict) return { valid: false, city: resolvedCity, error: 'İlçe bilgisi zorunlu.' };

  const resolvedDistrict = resolveTrDistrict(resolvedCity, rawDistrict);
  if (!resolvedDistrict) {
    return {
      valid: false,
      city: resolvedCity,
      error: `${resolvedCity} için "${rawDistrict}" geçerli bir ilçe değil. Lütfen ilçeyi tekrar sorun.`,
    };
  }

  return { valid: true, city: resolvedCity, district: resolvedDistrict };
}

export { TR_GEO };
