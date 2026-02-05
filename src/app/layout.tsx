import type { Metadata } from 'next'
// import { Geist, Geist_Mono } from "next/font/google";
import { headers } from 'next/headers'
import './globals.css'
import { Providers } from './providers'
import { getDirFromLocale, defaultLocale } from '@/lib/i18n'

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'RediverIO'
const appDescription =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Continuous Threat Exposure Management Platform'

export const metadata: Metadata = {
  title: appName,
  description: `${appName} - ${appDescription}`,
}

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const h = await headers()
  const locale = h.get('x-locale') ?? defaultLocale
  const dir = getDirFromLocale(locale)
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        // className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        className="antialiased"
        suppressHydrationWarning
      >
        <Providers dir={dir}>{children}</Providers>
      </body>
    </html>
  )
}
