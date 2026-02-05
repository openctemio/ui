'use client'

import { useEffect } from 'react'
import { ThemeProvider } from '@/context/theme-provider'
import { DirectionProvider } from '@/context/direction-provider'
import { SWRProvider } from '@/lib/swr-config'
import { Toaster } from 'sonner'

export function Providers({ children, dir }: { children: React.ReactNode; dir: 'ltr' | 'rtl' }) {
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
          {children}
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
