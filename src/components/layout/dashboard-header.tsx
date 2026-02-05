'use client'

// import { usePathname } from 'next/navigation'
import { Header } from './app-header'

export function DashboardHeader() {
  // const pathname = usePathname()

  // Define routes where the global header should be hidden
  // Define routes where the global header should be hidden (to allow custom local headers).
  // Strategy:
  // 1. Centralized header is the default for consistency and performance.
  // 2. Exceptions are defined here using Regex for precision.
  // 3. Current exception: /findings/[id] needs a custom back button and title.
  // const shouldHideHeader = /^\/findings\/[^/]+$/.test(pathname)

  // if (shouldHideHeader) {
  //   return null
  // }

  return <Header fixed />
}
