'use client'

import { useEffect } from 'react'
import { ThemeProvider } from '@/context/theme-provider'
import { DirectionProvider } from '@/context/direction-provider'
import { I18nProvider } from '@/context/i18n-provider'
import { SWRProvider } from '@/lib/swr-config'
import { Toaster } from 'sonner'

export function Providers({
  children,
  dir,
  locale,
}: {
  children: React.ReactNode
  dir: 'ltr' | 'rtl'
  locale: string
}) {
  // Initialize Web Vitals reporting (lazy load to avoid bundling optional dependencies)
  useEffect(() => {
    // Only load web-vitals module if Sentry DSN is configured
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import('@/lib/web-vitals')
        .then((module) => module.initWebVitals())
        .catch(() => {
          // Module not available, skip silently
        })
    }
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SWRProvider>
        <DirectionProvider dir={dir}>
          <I18nProvider locale={locale}>{children}</I18nProvider>
          <Toaster
            richColors
            position="bottom-right"
            expand={true}
            visibleToasts={3}
            closeButton
            toastOptions={{
              style: {
                // Ensure action buttons are always visible
                minHeight: '48px',
              },
            }}
          />
        </DirectionProvider>
      </SWRProvider>
    </ThemeProvider>
  )
}
