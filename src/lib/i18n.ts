import en from './i18n/dictionaries/en.json'
import vi from './i18n/dictionaries/vi.json'

export const rtlLocales = new Set(['ar', 'he', 'fa', 'ur'])
export function getDirFromLocale(locale?: string): 'ltr' | 'rtl' {
  const code = (locale ?? defaultLocale).split('-')[0]
  return rtlLocales.has(code) ? 'rtl' : 'ltr'
}
export const supportedLocales = ['en', 'vi', 'ar'] as const
export const defaultLocale = 'en'

// ============================================================
// Translation layer (lightweight, dependency-free)
// ============================================================

export type Dictionary = Record<string, string>
export type TranslateVars = Record<string, string | number>

// Static catalogs. `ar` intentionally falls back to English until translated —
// its RTL direction is already handled by getDirFromLocale.
const enDict: Dictionary = en
const dictionaries: Record<string, Dictionary> = { en: enDict, vi }

/** Returns the message catalog for a locale, falling back to English. */
export function getDictionary(locale?: string): Dictionary {
  const code = (locale ?? defaultLocale).split('-')[0]
  return dictionaries[code] ?? dictionaries[defaultLocale] ?? enDict
}

/**
 * Resolves a message key against a catalog with `{var}` interpolation.
 * Resolution order: catalog[key] → English catalog[key] → `fallback` → `key`.
 * The English fallback means a key missing only from a non-English catalog
 * still renders sensible text, so translation can be filled in incrementally.
 */
export function translate(
  dict: Dictionary,
  key: string,
  fallback?: string,
  vars?: TranslateVars
): string {
  let str = dict[key] ?? enDict[key] ?? fallback ?? key
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      str = str.split(`{${name}}`).join(String(value))
    }
  }
  return str
}
