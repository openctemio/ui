'use client'

import { Languages, Check } from 'lucide-react'
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { supportedLocales } from '@/lib/i18n'
import { useTranslation } from '@/context/i18n-provider'
import { cn } from '@/lib/utils'

// Native language names — always shown in their own language, never translated.
const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
  ar: 'العربية',
}

// Persist the choice in the `locale` cookie (the proxy reads it first, above
// Accept-Language) and reload so the server re-renders with the new x-locale.
function selectLocale(locale: string) {
  document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`
  window.location.reload()
}

/**
 * A language picker submenu for a DropdownMenu (e.g. the profile menu). Sets the
 * `locale` cookie and reloads. Renders only supported locales; the active one
 * gets a check. Meant to be placed inside a <DropdownMenuContent>.
 */
export function LanguageSwitcher() {
  const { locale, t } = useTranslation()

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-2">
        <Languages className="h-4 w-4" />
        {t('common.language', 'Language')}
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          {supportedLocales.map((l) => (
            <DropdownMenuItem key={l} onClick={() => selectLocale(l)} className="gap-2">
              <Check className={cn('h-4 w-4', l === locale ? 'opacity-100' : 'opacity-0')} />
              {LOCALE_LABELS[l] ?? l}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  )
}
