import { type ReactNode } from 'react'

/**
 * Secret Store Layout
 *
 * Secret store securely stores authentication credentials (Git tokens,
 * AWS keys, etc.) used by template sources to access external repositories.
 */
export default function SecretStoreLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
