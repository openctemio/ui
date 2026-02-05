export const rtlLocales = new Set(["ar", "he", "fa", "ur"])
export function getDirFromLocale(locale?: string): "ltr" | "rtl" {
  const code = (locale ?? defaultLocale).split("-")[0]
  return rtlLocales.has(code) ? "rtl" : "ltr"
}
export const supportedLocales = ["en", "vi", "ar"] as const
export const defaultLocale = "en"