'use client'

import { createContext, useContext, useMemo, useCallback } from 'react'
import { getDictionary, translate, defaultLocale, type TranslateVars } from '@/lib/i18n'

type TranslateFn = (key: string, fallback?: string, vars?: TranslateVars) => string

type I18nContextValue = {
  locale: string
  t: TranslateFn
}

const I18nContext = createContext<I18nContextValue | null>(null)

/**
 * Provides the active locale + a `t()` translator to the client tree. The locale
 * is resolved server-side (from the `x-locale` header, see app/layout.tsx) and
 * threaded down, so the first paint already matches the detected language.
 */
export function I18nProvider({ locale, children }: { locale: string; children: React.ReactNode }) {
  const dict = useMemo(() => getDictionary(locale), [locale])
  const t = useCallback<TranslateFn>(
    (key, fallback, vars) => translate(dict, key, fallback, vars),
    [dict]
  )
  const value = useMemo(() => ({ locale, t }), [locale, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/** Access the `t()` translator and active locale. */
export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Graceful fallback outside a provider (e.g. isolated component tests):
    // resolve against the default catalog rather than throwing.
    const dict = getDictionary(defaultLocale)
    return {
      locale: defaultLocale,
      t: ((key, fallback, vars) => translate(dict, key, fallback, vars)) as TranslateFn,
    }
  }
  return ctx
}
