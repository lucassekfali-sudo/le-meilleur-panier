/**
 * List of countries the app supports at signup.
 * Each entry maps to:
 *  - currency  : ISO 4217 code used by Intl.NumberFormat for prices
 *  - locale    : default locale (also drives number/date formatting)
 *  - language  : preselected app language (must match Language type)
 *
 * Strategy: cover Europe + Americas for now. The default fallback
 * is France (EUR / fr).
 */
import type { Language } from './translations';

export type CurrencyCode =
  | 'EUR'
  | 'GBP'
  | 'CHF'
  | 'USD'
  | 'CAD'
  | 'MXN'
  | 'BRL'
  | 'ARS'
  | 'CLP'
  | 'COP'
  | 'PEN'
  | 'UYU';

export interface Country {
  /** ISO 3166-1 alpha-2 code, lowercased */
  code: string;
  flag: string;
  /** Country name, in 3 languages */
  name: { fr: string; en: string; es: string };
  currency: CurrencyCode;
  locale: string;
  /** Default app language for the country (FR/EN/ES only) */
  language: Language;
}

export const COUNTRIES: Country[] = [
  // === Europe (francophone) ===
  { code: 'fr', flag: '🇫🇷', name: { fr: 'France', en: 'France', es: 'Francia' }, currency: 'EUR', locale: 'fr-FR', language: 'fr' },
  { code: 'be', flag: '🇧🇪', name: { fr: 'Belgique', en: 'Belgium', es: 'Bélgica' }, currency: 'EUR', locale: 'fr-BE', language: 'fr' },
  { code: 'ch', flag: '🇨🇭', name: { fr: 'Suisse', en: 'Switzerland', es: 'Suiza' }, currency: 'CHF', locale: 'fr-CH', language: 'fr' },
  { code: 'lu', flag: '🇱🇺', name: { fr: 'Luxembourg', en: 'Luxembourg', es: 'Luxemburgo' }, currency: 'EUR', locale: 'fr-LU', language: 'fr' },
  { code: 'mc', flag: '🇲🇨', name: { fr: 'Monaco', en: 'Monaco', es: 'Mónaco' }, currency: 'EUR', locale: 'fr-FR', language: 'fr' },

  // === Europe (autres) ===
  { code: 'es', flag: '🇪🇸', name: { fr: 'Espagne', en: 'Spain', es: 'España' }, currency: 'EUR', locale: 'es-ES', language: 'es' },
  { code: 'pt', flag: '🇵🇹', name: { fr: 'Portugal', en: 'Portugal', es: 'Portugal' }, currency: 'EUR', locale: 'pt-PT', language: 'es' },
  { code: 'gb', flag: '🇬🇧', name: { fr: 'Royaume-Uni', en: 'United Kingdom', es: 'Reino Unido' }, currency: 'GBP', locale: 'en-GB', language: 'en' },
  { code: 'ie', flag: '🇮🇪', name: { fr: 'Irlande', en: 'Ireland', es: 'Irlanda' }, currency: 'EUR', locale: 'en-IE', language: 'en' },
  { code: 'de', flag: '🇩🇪', name: { fr: 'Allemagne', en: 'Germany', es: 'Alemania' }, currency: 'EUR', locale: 'de-DE', language: 'en' },
  { code: 'it', flag: '🇮🇹', name: { fr: 'Italie', en: 'Italy', es: 'Italia' }, currency: 'EUR', locale: 'it-IT', language: 'en' },
  { code: 'nl', flag: '🇳🇱', name: { fr: 'Pays-Bas', en: 'Netherlands', es: 'Países Bajos' }, currency: 'EUR', locale: 'nl-NL', language: 'en' },
  { code: 'at', flag: '🇦🇹', name: { fr: 'Autriche', en: 'Austria', es: 'Austria' }, currency: 'EUR', locale: 'de-AT', language: 'en' },
  { code: 'gr', flag: '🇬🇷', name: { fr: 'Grèce', en: 'Greece', es: 'Grecia' }, currency: 'EUR', locale: 'el-GR', language: 'en' },
  { code: 'pl', flag: '🇵🇱', name: { fr: 'Pologne', en: 'Poland', es: 'Polonia' }, currency: 'EUR', locale: 'pl-PL', language: 'en' },

  // === Amérique du Nord ===
  { code: 'us', flag: '🇺🇸', name: { fr: 'États-Unis', en: 'United States', es: 'Estados Unidos' }, currency: 'USD', locale: 'en-US', language: 'en' },
  { code: 'ca', flag: '🇨🇦', name: { fr: 'Canada', en: 'Canada', es: 'Canadá' }, currency: 'CAD', locale: 'fr-CA', language: 'fr' },
  { code: 'mx', flag: '🇲🇽', name: { fr: 'Mexique', en: 'Mexico', es: 'México' }, currency: 'MXN', locale: 'es-MX', language: 'es' },

  // === Amérique du Sud ===
  { code: 'br', flag: '🇧🇷', name: { fr: 'Brésil', en: 'Brazil', es: 'Brasil' }, currency: 'BRL', locale: 'pt-BR', language: 'es' },
  { code: 'ar', flag: '🇦🇷', name: { fr: 'Argentine', en: 'Argentina', es: 'Argentina' }, currency: 'ARS', locale: 'es-AR', language: 'es' },
  { code: 'cl', flag: '🇨🇱', name: { fr: 'Chili', en: 'Chile', es: 'Chile' }, currency: 'CLP', locale: 'es-CL', language: 'es' },
  { code: 'co', flag: '🇨🇴', name: { fr: 'Colombie', en: 'Colombia', es: 'Colombia' }, currency: 'COP', locale: 'es-CO', language: 'es' },
  { code: 'pe', flag: '🇵🇪', name: { fr: 'Pérou', en: 'Peru', es: 'Perú' }, currency: 'PEN', locale: 'es-PE', language: 'es' },
  { code: 'uy', flag: '🇺🇾', name: { fr: 'Uruguay', en: 'Uruguay', es: 'Uruguay' }, currency: 'UYU', locale: 'es-UY', language: 'es' },
];

/** Default fallback if user country is unknown / not in list. */
export const DEFAULT_COUNTRY: Country = COUNTRIES[0]; // France

/**
 * Returns the country object matching a code, or the default if not found.
 */
export function getCountry(code: string | null | undefined): Country {
  if (!code) return DEFAULT_COUNTRY;
  const c = COUNTRIES.find((c) => c.code === code.toLowerCase());
  return c ?? DEFAULT_COUNTRY;
}

/**
 * Returns the currency code for a country code (or default EUR).
 */
export function getCurrencyForCountry(code: string | null | undefined): CurrencyCode {
  return getCountry(code).currency;
}

/**
 * Returns the locale string (e.g. "fr-FR") for a country code.
 */
export function getLocaleForCountry(code: string | null | undefined): string {
  return getCountry(code).locale;
}

/**
 * Format a number as currency for a given country.
 */
export function formatPrice(
  amount: number,
  countryCode: string | null | undefined,
  decimals = 2
): string {
  const c = getCountry(countryCode);
  return new Intl.NumberFormat(c.locale, {
    style: 'currency',
    currency: c.currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}
